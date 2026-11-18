// Čítanie SteelSeries Arctis headsetu cez USB HID (koliesko ChatMix, batéria, pripojenie).
// Overené na Arctis Nova 5X: koliesko posiela 0x45 [game, chat] samo, status 0xb0 sa dá vyžiadať.
// Viac procesov môže čítať naraz (engine aj okno appky) – Windows doručí report každému.
use hidapi::{HidApi, HidDevice};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

pub const VID_STEELSERIES: u16 = 0x1038;

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
pub struct HeadsetState {
    /// dongle je zapojený
    pub present: bool,
    /// slúchadlá sú zapnuté a spárované s donglom (ak to vieme zistiť)
    pub connected: bool,
    pub product: String,
    pub pid: u16,
    /// poloha kolieska: game a chat hlasitosť 0–100 (-1 = zatiaľ nevieme)
    pub game: i32,
    pub chat: i32,
    /// batéria v %, -1 = nevieme
    pub battery: i32,
    pub charging: bool,
}

#[derive(Clone, Copy, PartialEq)]
enum Family { Nova5, Nova7, Other }

fn family(product: &str) -> Family {
    let p = product.to_lowercase();
    if p.contains("nova 5") { Family::Nova5 } else if p.contains("nova 7") || p.contains("7+") { Family::Nova7 } else { Family::Other }
}

struct Open {
    dev: HidDevice,
    poll: bool,
}

fn valid_mix(game: i32, chat: i32) -> bool {
    // ChatMix má vždy jednu stranu na 100; iné hodnoty = vypnuté slúchadlá alebo smeti
    (0..=100).contains(&game) && (0..=100).contains(&chat) && game.max(chat) == 100
}

/// Spracuje jeden HID report. Vráti true, ak sa stav zmenil.
/// `status_mix` = brať polohu kolieska aj zo stavového paketu (len keď koliesko chvíľu neposlalo event,
/// inak by starší stav vracal knob späť a slider by skákal).
fn parse(st: &mut HeadsetState, fam: Family, raw: &[u8], status_mix: bool) -> bool {
    let d = if raw.len() > 1 && raw[0] == 0 { &raw[1..] } else { raw };
    if d.len() < 3 { return false; }
    let before = st.clone();
    match d[0] {
        0x45 => {
            let (g, c) = (d[1] as i32, d[2] as i32);
            if valid_mix(g, c) { st.game = g; st.chat = c; st.connected = true; }
        }
        0xb0 => match fam {
            Family::Nova5 if d.len() >= 7 => {
                st.connected = d[1] != 0x02;
                if st.connected {
                    if d[3] <= 100 { st.battery = d[3] as i32; }
                    st.charging = d[4] == 0x01;
                    let (g, c) = (d[5] as i32, d[6] as i32);
                    if status_mix && valid_mix(g, c) { st.game = g; st.chat = c; }
                }
            }
            Family::Nova7 if d.len() >= 6 => {
                st.connected = d[1] == 0x03;
                if st.connected {
                    if d[2] <= 4 { st.battery = d[2] as i32 * 25; }
                    st.charging = d[3] == 0x01;
                    let (g, c) = (d[4] as i32, d[5] as i32);
                    if status_mix && valid_mix(g, c) { st.game = g; st.chat = c; }
                }
            }
            _ => {}
        },
        _ => {}
    }
    *st != before
}

/// Nájde a otvorí vendor rozhrania Arctis headsetu.
fn open_headset(api: &mut HidApi) -> Option<(Vec<Open>, String, u16)> {
    let _ = api.refresh_devices();
    let mut out: Vec<Open> = Vec::new();
    let mut product = String::new();
    let mut pid = 0u16;
    let infos: Vec<_> = api
        .device_list()
        .filter(|d| d.vendor_id() == VID_STEELSERIES)
        .filter(|d| d.product_string().unwrap_or("").to_lowercase().contains("arctis"))
        .filter(|d| d.usage_page() >= 0xFF00)
        .cloned()
        .collect();
    // status sa pýta na rozhraní 3 (usage page 0xFFC0), eventy chodia na rozhraní 5
    let poll_idx = infos.iter().position(|d| d.usage_page() == 0xFFC0)
        .or_else(|| infos.iter().position(|d| d.interface_number() == 3));
    for (i, info) in infos.iter().enumerate() {
        if let Ok(dev) = info.open_device(api) {
            let _ = dev.set_blocking_mode(false);
            if product.is_empty() {
                product = info.product_string().unwrap_or("Arctis").trim().to_string();
                pid = info.product_id();
            }
            out.push(Open { dev, poll: Some(i) == poll_idx });
        }
    }
    if out.is_empty() { None } else { Some((out, product, pid)) }
}

/// Beží, kým `stop` nie je true. Pri každej zmene zavolá `on_change`.
pub fn run(stop: Arc<AtomicBool>, mut on_change: impl FnMut(&HeadsetState)) {
    let mut api = match HidApi::new() {
        Ok(a) => a,
        Err(_) => return,
    };
    let mut st = HeadsetState { game: -1, chat: -1, battery: -1, ..Default::default() };
    on_change(&st);
    while !stop.load(Ordering::Relaxed) {
        let Some((devs, product, pid)) = open_headset(&mut api) else {
            if st.present {
                st = HeadsetState { game: -1, chat: -1, battery: -1, ..Default::default() };
                on_change(&st);
            }
            sleep_while(&stop, Duration::from_millis(1500));
            continue;
        };
        let fam = family(&product);
        st = HeadsetState { present: true, connected: true, product, pid, game: -1, chat: -1, battery: -1, charging: false };
        on_change(&st);

        let mut buf = [0u8; 65];
        let mut last_poll = Instant::now() - Duration::from_secs(10);
        let mut last_event: Option<Instant> = None;
        let mut dead = false;
        while !stop.load(Ordering::Relaxed) && !dead {
            if last_poll.elapsed() >= Duration::from_secs(2) {
                for d in devs.iter().filter(|d| d.poll) {
                    let mut req = [0u8; 65];
                    req[1] = 0xb0;
                    if d.dev.write(&req).is_err() { dead = true; }
                }
                last_poll = Instant::now();
            }
            let mut any = false;
            for d in &devs {
                match d.dev.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        any = true;
                        let raw = &buf[..n];
                        let kind = if raw.len() > 1 && raw[0] == 0 { raw[1] } else { raw[0] };
                        if kind == 0x45 { last_event = Some(Instant::now()); }
                        let status_mix = last_event.map_or(true, |t| t.elapsed() > Duration::from_secs(3));
                        if parse(&mut st, fam, raw, status_mix) { on_change(&st); }
                    }
                    Ok(_) => {}
                    Err(_) => { dead = true; }
                }
            }
            if !any { std::thread::sleep(Duration::from_millis(15)); }
        }
        drop(devs);
        if !stop.load(Ordering::Relaxed) {
            st = HeadsetState { game: -1, chat: -1, battery: -1, ..Default::default() };
            on_change(&st);
            sleep_while(&stop, Duration::from_millis(1000));
        }
    }
}

fn sleep_while(stop: &AtomicBool, d: Duration) {
    let end = Instant::now() + d;
    while Instant::now() < end && !stop.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn st() -> HeadsetState { HeadsetState { game: -1, chat: -1, battery: -1, present: true, ..Default::default() } }

    #[test]
    fn nova5x_from_real_log() {
        let mut s = st();
        // skutočné dáta z Alexovho Nova 5X
        assert!(parse(&mut s, Family::Nova5, &[0x45, 0x64, 0x47, 0, 0, 0, 0, 0], true));
        assert_eq!((s.game, s.chat), (100, 71));
        let status = [0xb0, 0x03, 0x02, 0x64, 0x03, 0x3e, 0x64, 0x30, 0x31];
        assert!(parse(&mut s, Family::Nova5, &status, true));
        assert_eq!((s.game, s.chat, s.battery, s.connected), (62, 100, 100, true));
        // s report ID 0 na začiatku
        assert!(parse(&mut s, Family::Nova5, &[0x00, 0x45, 0x64, 0x64, 0, 0], true));
        assert_eq!((s.game, s.chat), (100, 100));
    }

    #[test]
    fn rejects_garbage() {
        let mut s = st();
        parse(&mut s, Family::Nova5, &[0x45, 0x64, 0x64], true);
        // vypnuté slúchadlá: nuly nesmú stlmiť všetko
        assert!(!parse(&mut s, Family::Nova5, &[0x45, 0x00, 0x00, 0], true));
        assert_eq!((s.game, s.chat), (100, 100));
        parse(&mut s, Family::Nova5, &[0xb0, 0x02, 0, 0, 0, 0, 0], true);
        assert!(!s.connected);
        assert_eq!((s.game, s.chat), (100, 100));
    }

    #[test]
    fn stale_status_does_not_move_wheel() {
        let mut s = st();
        parse(&mut s, Family::Nova5, &[0x45, 0x64, 0x21, 0, 0], true);
        // starší stav (chat 71) počas točenia nesmie vrátiť koliesko späť, batéria sa ale prečíta
        parse(&mut s, Family::Nova5, &[0xb0, 0x03, 0x02, 0x40, 0x00, 0x64, 0x47], false);
        assert_eq!((s.game, s.chat, s.battery), (100, 33, 64));
    }
}
