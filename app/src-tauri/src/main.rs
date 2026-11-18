// MixItUp – ChatMix pre SteelSeries slúchadlá bez Sonaru (od WheresTheApp)
//
// Jeden .exe, dva režimy:
//   MixItUp.exe            okno na nastavenie (Tauri)
//   MixItUp.exe --engine   ChatMix na pozadí, bez okna a bez WebView (spúšťa sa pri štarte Windowsu)
//   MixItUp.exe --stop     slušne ukončí engine (vráti hlasitosti)
//   MixItUp.exe --uninstall  ukončí engine, vypne autoštart, vráti hlasitosti
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod config;
mod engine;
mod headset;
mod steelseries;
mod update;

use serde::Serialize;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, Manager};
use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN_NAME: &str = "MixItUp";

fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> impl std::future::Future<Output = Result<T, String>> {
    async move {
        tauri::async_runtime::spawn_blocking(move || {
            audio::com_init();
            f()
        })
        .await
        .map_err(|e| e.to_string())
    }
}

// ------------------------------------------------------------------ autoštart enginu

fn autostart_get() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(RUN_KEY)
        .and_then(|k| k.get_value::<String, _>(RUN_NAME))
        .map(|v| !v.is_empty())
        .unwrap_or(false)
}

fn autostart_write(on: bool) -> Result<(), String> {
    let (k, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(RUN_KEY).map_err(|e| e.to_string())?;
    if on {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        k.set_value(RUN_NAME, &format!("\"{}\" --engine", exe.display())).map_err(|e| e.to_string())
    } else {
        match k.delete_value(RUN_NAME) {
            Ok(_) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

// ------------------------------------------------------------------ príkazy pre UI

#[derive(Serialize)]
struct AppState {
    version: String,
    config: config::Config,
    engine: bool,
    autostart: bool,
    data_dir: String,
}

#[tauri::command]
fn app_state() -> AppState {
    AppState {
        version: env!("CARGO_PKG_VERSION").into(),
        config: config::load(),
        engine: engine::is_running(),
        autostart: autostart_get(),
        data_dir: config::data_dir().display().to_string(),
    }
}

#[tauri::command]
fn config_save(cfg: config::Config) -> Result<(), String> { config::save(&cfg) }

#[tauri::command]
async fn engine_set(on: bool) -> Result<bool, String> {
    blocking(move || {
        if on {
            if !engine::is_running() {
                engine::spawn_detached()?;
                for _ in 0..30 {
                    if engine::is_running() { break; }
                    std::thread::sleep(Duration::from_millis(100));
                }
            }
        } else {
            engine::request_stop(Duration::from_secs(4));
            engine::restore_if_idle();
        }
        Ok(engine::is_running())
    })
    .await?
}

#[tauri::command]
fn autostart_set(on: bool) -> Result<bool, String> {
    autostart_write(on)?;
    Ok(autostart_get())
}

#[derive(Serialize)]
struct Snapshot {
    endpoints: Vec<audio::Endpoint>,
    sessions: Vec<audio::SessionInfo>,
    targets: Vec<String>,
}

#[tauri::command]
async fn audio_snapshot() -> Result<Snapshot, String> {
    blocking(|| {
        let cfg = config::load();
        let endpoints = audio::endpoints();
        let targets = audio::target_endpoints(&cfg, &endpoints);
        Snapshot { sessions: audio::session_infos(), targets, endpoints }
    })
    .await
}

#[tauri::command]
async fn ss_report() -> Result<steelseries::Report, String> { blocking(steelseries::report).await }

#[tauri::command]
async fn ss_startup(enabled: bool) -> Result<usize, String> { blocking(move || steelseries::set_startup(enabled)).await? }

#[tauri::command]
async fn ss_stop() -> Result<(), String> { blocking(steelseries::stop_gg).await? }

#[tauri::command]
async fn ss_sonar_devices(enabled: bool) -> Result<(), String> { blocking(move || steelseries::set_sonar_devices(enabled)).await? }

#[tauri::command]
async fn set_default_device(id: String) -> Result<(), String> { blocking(move || audio::set_default(&id)).await? }

#[tauri::command]
async fn reset_volumes() -> Result<usize, String> {
    blocking(|| {
        let was = engine::is_running();
        if was { engine::request_stop(Duration::from_secs(4)); }
        let n = audio::reset_all();
        if was { let _ = engine::spawn_detached(); }
        n
    })
    .await
}

#[tauri::command]
fn headset_now(state: tauri::State<'_, HeadsetShared>) -> headset::HeadsetState {
    state.0.lock().map(|s| s.clone()).unwrap_or_default()
}

struct HeadsetShared(Arc<Mutex<headset::HeadsetState>>);

// ------------------------------------------------------------------ main

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let has = |a: &str| args.iter().any(|x| x.eq_ignore_ascii_case(a));

    if has("--engine") {
        engine::run();
        return;
    }
    if has("--stop") || has("--uninstall") {
        audio::com_init();
        engine::request_stop(Duration::from_secs(5));
        engine::restore_if_idle();
        if has("--uninstall") { let _ = autostart_write(false); }
        return;
    }

    // okno: ak engine nebeží (napr. spadol), vráť hlasitosti zo záznamu
    std::thread::spawn(|| {
        audio::com_init();
        engine::restore_if_idle();
    });

    let shared = Arc::new(Mutex::new(headset::HeadsetState { game: -1, chat: -1, battery: -1, ..Default::default() }));

    tauri::Builder::default()
        .manage(HeadsetShared(shared.clone()))
        .setup(move |app| {
            // živý stav slúchadiel pre okno (engine si číta svoje)
            let handle = app.handle().clone();
            let stop = Arc::new(AtomicBool::new(false));
            let shared = shared.clone();
            std::thread::spawn(move || {
                headset::run(stop, move |st| {
                    if let Ok(mut s) = shared.lock() { *s = st.clone(); }
                    let _ = handle.emit("headset", st.clone());
                });
            });
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_title("MixItUp");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_state,
            config_save,
            engine_set,
            autostart_set,
            audio_snapshot,
            ss_report,
            ss_startup,
            ss_stop,
            ss_sonar_devices,
            set_default_device,
            reset_volumes,
            headset_now,
            update::update_check,
            update::update_install,
        ])
        .run(tauri::generate_context!())
        .expect("MixItUp sa nepodarilo spustiť");
}
