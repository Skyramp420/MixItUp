// ChatMix engine – beží na pozadí bez okna (MixItUp.exe --engine).
// Číta koliesko a nastavuje hlasitosti aplikácií na slúchadlách. Pri ukončení ich vráti.
use crate::{audio, config, headset};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use windows::core::w;
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Threading::*;

pub const MUTEX_NAME: windows::core::PCWSTR = w!("Local\\MixItUpEngine");
pub const STOP_EVENT: windows::core::PCWSTR = w!("Local\\MixItUpEngineStop");

pub fn is_running() -> bool {
    unsafe {
        match OpenMutexW(SYNCHRONIZATION_SYNCHRONIZE, false, MUTEX_NAME) {
            Ok(h) => { let _ = CloseHandle(h); true }
            Err(_) => false,
        }
    }
}

/// Požiada bežiaci engine o slušné ukončenie (vráti hlasitosti) a počká naň.
pub fn request_stop(wait: Duration) -> bool {
    unsafe {
        if let Ok(ev) = OpenEventW(EVENT_MODIFY_STATE, false, STOP_EVENT) {
            let _ = SetEvent(ev);
            let _ = CloseHandle(ev);
        }
    }
    let end = Instant::now() + wait;
    while Instant::now() < end {
        if !is_running() { return true; }
        std::thread::sleep(Duration::from_millis(100));
    }
    !is_running()
}

pub fn spawn_detached() -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    std::process::Command::new(exe)
        .arg("--engine")
        .creation_flags(0x0000_0008 | 0x0800_0000) // DETACHED_PROCESS | CREATE_NO_WINDOW
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("ChatMix sa nespustil: {e}"))
}

pub fn run() {
    unsafe {
        let mutex = CreateMutexW(None, true, MUTEX_NAME);
        if mutex.is_err() || GetLastError() == ERROR_ALREADY_EXISTS { return; }
        let stop_ev: HANDLE = match CreateEventW(None, true, false, STOP_EVENT) {
            Ok(h) => h,
            Err(_) => return,
        };
        let _ = SetPriorityClass(GetCurrentProcess(), BELOW_NORMAL_PRIORITY_CLASS);

        audio::com_init();

        // koliesko číta samostatné vlákno, sem len posiela poslednú polohu
        let wheel: Arc<Mutex<(i32, i32)>> = Arc::new(Mutex::new((-1, -1)));
        let stop = Arc::new(AtomicBool::new(false));
        {
            let wheel = wheel.clone();
            let stop = stop.clone();
            std::thread::spawn(move || {
                headset::run(stop, |st| {
                    if let Ok(mut w) = wheel.lock() { *w = (st.game, st.chat); }
                });
            });
        }

        let mut cfg = config::load();
        let mut cfg_time = config::mtime();
        let mut journal = audio::Journal::load();
        let mut names = audio::ProcNames::new();
        let mut last = (-2, -2);
        let mut last_scan = Instant::now() - Duration::from_secs(60);
        let mut last_names_clear = Instant::now();

        loop {
            if WaitForSingleObject(stop_ev, 60) == WAIT_OBJECT_0 { break; }

            let t = config::mtime();
            let mut force = false;
            if t != cfg_time {
                cfg_time = t;
                cfg = config::load();
                force = true;
            }
            if last_names_clear.elapsed() > Duration::from_secs(120) {
                names.clear();
                last_names_clear = Instant::now();
            }

            let (g, c) = *wheel.lock().unwrap();
            if g < 0 || c < 0 { continue; } // koliesko zatiaľ nepoznáme -> na nič nesiahame
            let (game, chat) = if cfg.swap { (c, g) } else { (g, c) };
            let changed = (game, chat) != last;
            // nové aplikácie a prepnutie výstupov zachytíme do ~1,5 s
            if changed || force || last_scan.elapsed() > Duration::from_millis(1500) {
                let eps = audio::endpoints();
                let targets = audio::target_endpoints(&cfg, &eps);
                let ss = audio::sessions(&mut names);
                if audio::apply(&ss, &targets, &cfg, game as f32 / 100.0, chat as f32 / 100.0, &mut journal) {
                    journal.save();
                }
                last = (game, chat);
                last_scan = Instant::now();
            }
        }

        // koniec: vráť hlasitosti
        stop.store(true, Ordering::Relaxed);
        let ss = audio::sessions(&mut names);
        audio::restore(&ss, &mut journal);
        journal.save();
        let _ = CloseHandle(stop_ev);
        if let Ok(m) = mutex { let _ = CloseHandle(m); }
    }
}

/// Pri štarte appky / po páde: ak engine nebeží, vráť hlasitosti zo záznamu.
pub fn restore_if_idle() {
    if is_running() { return; }
    let mut j = audio::Journal::load();
    if j.original.is_empty() { return; }
    let mut names = audio::ProcNames::new();
    let ss = audio::sessions(&mut names);
    audio::restore(&ss, &mut j);
    j.save();
}
