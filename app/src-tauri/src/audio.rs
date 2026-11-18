// Windows audio: výstupy, hlasitosti aplikácií (audio sessions), predvolené zariadenie.
// Všetko volať z vlákna s inicializovaným COM (com_init()).
#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use windows::core::{interface, Interface, GUID, PCWSTR, PWSTR};
use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
use windows::Win32::Foundation::{CloseHandle, S_OK};
use windows::Win32::Media::Audio::*;
use windows::Win32::System::Com::StructuredStorage::PropVariantToStringAlloc;
use windows::Win32::System::Com::*;
use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};

pub fn com_init() {
    unsafe { let _ = CoInitializeEx(None, COINIT_MULTITHREADED); }
}

#[derive(Serialize, Clone, Debug)]
pub struct Endpoint {
    pub id: String,
    pub name: String,
    /// "render" (výstup) alebo "capture" (mikrofón)
    pub flow: String,
    pub default: bool,
    pub default_comm: bool,
    pub sonar: bool,
    pub arctis: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct SessionInfo {
    pub app: String,
    pub endpoint_id: String,
    pub volume: f32,
    pub active: bool,
}

fn take_pwstr(p: PWSTR) -> String {
    if p.is_null() { return String::new(); }
    unsafe {
        let s = p.to_string().unwrap_or_default();
        CoTaskMemFree(Some(p.0 as _));
        s
    }
}

fn enumerator() -> windows::core::Result<IMMDeviceEnumerator> {
    unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
}

fn friendly_name(dev: &IMMDevice) -> String {
    unsafe {
        let Ok(store) = dev.OpenPropertyStore(STGM_READ) else { return String::new() };
        let Ok(pv) = store.GetValue(&PKEY_Device_FriendlyName) else { return String::new() };
        match PropVariantToStringAlloc(&pv) {
            Ok(p) => take_pwstr(p),
            Err(_) => String::new(),
        }
    }
}

fn device_id(dev: &IMMDevice) -> String {
    unsafe { dev.GetId().map(take_pwstr).unwrap_or_default() }
}

fn default_id(en: &IMMDeviceEnumerator, flow: EDataFlow, role: ERole) -> String {
    unsafe { en.GetDefaultAudioEndpoint(flow, role).map(|d| device_id(&d)).unwrap_or_default() }
}

pub fn is_sonar_name(n: &str) -> bool { n.to_lowercase().contains("sonar") }
pub fn is_arctis_name(n: &str) -> bool {
    let l = n.to_lowercase();
    (l.contains("arctis") || l.contains("steelseries")) && !l.contains("sonar")
}

/// Všetky aktívne výstupy a mikrofóny.
pub fn endpoints() -> Vec<Endpoint> {
    let mut out = Vec::new();
    let Ok(en) = enumerator() else { return out };
    for (flow, fname) in [(eRender, "render"), (eCapture, "capture")] {
        let def = default_id(&en, flow, eConsole);
        let def_comm = default_id(&en, flow, eCommunications);
        unsafe {
            let Ok(col) = en.EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE) else { continue };
            let n = col.GetCount().unwrap_or(0);
            for i in 0..n {
                let Ok(dev) = col.Item(i) else { continue };
                let id = device_id(&dev);
                let name = friendly_name(&dev);
                out.push(Endpoint {
                    sonar: is_sonar_name(&name),
                    arctis: is_arctis_name(&name),
                    default: id == def,
                    default_comm: id == def_comm,
                    flow: fname.into(),
                    id,
                    name,
                });
            }
        }
    }
    out
}

// ------------------------------------------------------------------ procesy

pub struct ProcNames(HashMap<u32, String>);
impl ProcNames {
    pub fn new() -> Self { ProcNames(HashMap::new()) }
    pub fn clear(&mut self) { self.0.clear(); }
    pub fn get(&mut self, pid: u32) -> String {
        if let Some(n) = self.0.get(&pid) { return n.clone(); }
        let n = process_name(pid);
        self.0.insert(pid, n.clone());
        n
    }
}

fn process_name(pid: u32) -> String {
    unsafe {
        let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return String::new() };
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok();
        let _ = CloseHandle(h);
        if !ok { return String::new(); }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        std::path::Path::new(&path)
            .file_stem()
            .map(|s| s.to_string_lossy().to_lowercase())
            .unwrap_or_default()
    }
}

// ------------------------------------------------------------------ sessions

/// Jedna audio session aplikácie na konkrétnom výstupe.
pub struct Session {
    pub app: String,
    /// stabilný kľúč (výstup + identita aplikácie) – pod ním si Windows pamätá hlasitosť
    pub key: String,
    pub endpoint_id: String,
    pub active: bool,
    vol: ISimpleAudioVolume,
}

impl Session {
    pub fn volume(&self) -> f32 { unsafe { self.vol.GetMasterVolume().unwrap_or(1.0) } }
    pub fn set_volume(&self, v: f32) {
        let v = v.clamp(0.0, 1.0);
        if (self.volume() - v).abs() > 0.004 {
            unsafe { let _ = self.vol.SetMasterVolume(v, std::ptr::null()); }
        }
    }
}

/// Prejde všetky sessions aplikácií na všetkých aktívnych výstupoch (bez systémových zvukov).
pub fn sessions(names: &mut ProcNames) -> Vec<Session> {
    let mut out = Vec::new();
    let Ok(en) = enumerator() else { return out };
    unsafe {
        let Ok(col) = en.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE) else { return out };
        let n = col.GetCount().unwrap_or(0);
        for i in 0..n {
            let Ok(dev) = col.Item(i) else { continue };
            let eid = device_id(&dev);
            let Ok(mgr) = dev.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else { continue };
            let Ok(list) = mgr.GetSessionEnumerator() else { continue };
            let count = list.GetCount().unwrap_or(0);
            for k in 0..count {
                let Ok(ctl) = list.GetSession(k) else { continue };
                let Ok(ctl2) = ctl.cast::<IAudioSessionControl2>() else { continue };
                if ctl2.IsSystemSoundsSession() == S_OK { continue; }
                let pid = ctl2.GetProcessId().unwrap_or(0);
                if pid == 0 { continue; }
                let app = names.get(pid);
                if app.is_empty() { continue; }
                let ident = ctl2.GetSessionIdentifier().map(take_pwstr).unwrap_or_default();
                let Ok(vol) = ctl.cast::<ISimpleAudioVolume>() else { continue };
                let state = ctl.GetState().unwrap_or(AudioSessionStateInactive);
                out.push(Session {
                    key: format!("{}|{}", eid, if ident.is_empty() { app.clone() } else { ident }),
                    active: state == AudioSessionStateActive,
                    endpoint_id: eid.clone(),
                    app,
                    vol,
                });
            }
        }
    }
    out
}

pub fn session_infos() -> Vec<SessionInfo> {
    let mut names = ProcNames::new();
    let mut v: Vec<SessionInfo> = sessions(&mut names)
        .iter()
        .map(|s| SessionInfo { app: s.app.clone(), endpoint_id: s.endpoint_id.clone(), volume: s.volume(), active: s.active })
        .collect();
    v.sort_by(|a, b| a.app.cmp(&b.app));
    v
}

// ------------------------------------------------------------------ záznam pôvodných hlasitostí

/// Pôvodné hlasitosti aplikácií, ktoré ChatMix zmenil. Je na disku, aby sa dali vrátiť aj po páde.
#[derive(Serialize, Deserialize, Default)]
pub struct Journal {
    pub original: HashMap<String, f32>,
}

impl Journal {
    pub fn load() -> Journal {
        std::fs::read_to_string(crate::config::journal_path())
            .ok()
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default()
    }
    pub fn save(&self) {
        let _ = std::fs::create_dir_all(crate::config::data_dir());
        if let Ok(t) = serde_json::to_string(self) {
            let p = crate::config::journal_path();
            let tmp = p.with_extension("json.tmp");
            if std::fs::write(&tmp, t).is_ok() { let _ = std::fs::rename(&tmp, &p); }
        }
    }
}

/// Výstupy, na ktorých ChatMix pracuje.
pub fn target_endpoints(cfg: &crate::config::Config, eps: &[Endpoint]) -> Vec<String> {
    let render: Vec<&Endpoint> = eps.iter().filter(|e| e.flow == "render").collect();
    if cfg.all_outputs {
        return render.iter().filter(|e| !e.sonar).map(|e| e.id.clone()).collect();
    }
    if !cfg.output_id.is_empty() && render.iter().any(|e| e.id == cfg.output_id) {
        return vec![cfg.output_id.clone()];
    }
    render.iter().filter(|e| e.arctis).map(|e| e.id.clone()).collect()
}

/// Nastaví hlasitosti podľa kolieska. Aplikácie na iných výstupoch, ktoré ChatMix kedysi zmenil, vráti späť.
/// Vráti true, ak sa záznam zmenil (treba uložiť).
pub fn apply(sessions: &[Session], targets: &[String], cfg: &crate::config::Config, game: f32, chat: f32, j: &mut Journal) -> bool {
    let mut dirty = false;
    for s in sessions {
        if cfg.is_ignored(&s.app) {
            if let Some(o) = j.original.remove(&s.key) { s.set_volume(o); dirty = true; }
            continue;
        }
        if targets.iter().any(|t| *t == s.endpoint_id) {
            if !j.original.contains_key(&s.key) {
                j.original.insert(s.key.clone(), s.volume());
                dirty = true;
            }
            s.set_volume(if cfg.is_chat(&s.app) { chat } else { game });
        } else if let Some(o) = j.original.remove(&s.key) {
            // napr. appka sa presunula na reproduktory -> späť na pôvodnú hlasitosť
            s.set_volume(o);
            dirty = true;
        }
    }
    dirty
}

/// Vráti pôvodné hlasitosti všetkým aplikáciám, ktoré práve existujú. Ostatné ostanú v zázname na neskôr.
pub fn restore(sessions: &[Session], j: &mut Journal) {
    for s in sessions {
        if let Some(o) = j.original.remove(&s.key) { s.set_volume(o); }
    }
}

/// Núdzové tlačidlo: všetky aplikácie na všetkých výstupoch na 100 % a vymazať záznam.
pub fn reset_all() -> usize {
    let mut names = ProcNames::new();
    let ss = sessions(&mut names);
    for s in &ss { s.set_volume(1.0); }
    let j = Journal::default();
    j.save();
    ss.len()
}

// ------------------------------------------------------------------ predvolené zariadenie (IPolicyConfig)
// Nedokumentované, ale stabilné od Windows 7 – používa ho celý ekosystém (SoundSwitch, EarTrumpet, nircmd).

#[interface("f8679f50-850a-41cf-9c72-430f290290c8")]
unsafe trait IPolicyConfig: windows::core::IUnknown {
    fn GetMixFormat(&self, id: PCWSTR, fmt: *mut *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn GetDeviceFormat(&self, id: PCWSTR, default: i32, fmt: *mut *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn ResetDeviceFormat(&self, id: PCWSTR) -> windows::core::HRESULT;
    fn SetDeviceFormat(&self, id: PCWSTR, endpoint: *mut core::ffi::c_void, mix: *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn GetProcessingPeriod(&self, id: PCWSTR, default: i32, a: *mut i64, b: *mut i64) -> windows::core::HRESULT;
    fn SetProcessingPeriod(&self, id: PCWSTR, period: *mut i64) -> windows::core::HRESULT;
    fn GetShareMode(&self, id: PCWSTR, mode: *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn SetShareMode(&self, id: PCWSTR, mode: *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn GetPropertyValue(&self, id: PCWSTR, key: *const core::ffi::c_void, value: *mut core::ffi::c_void) -> windows::core::HRESULT;
    fn SetPropertyValue(&self, id: PCWSTR, key: *const core::ffi::c_void, value: *const core::ffi::c_void) -> windows::core::HRESULT;
    fn SetDefaultEndpoint(&self, id: PCWSTR, role: ERole) -> windows::core::HRESULT;
    fn SetEndpointVisibility(&self, id: PCWSTR, visible: i32) -> windows::core::HRESULT;
}

const CLSID_POLICY_CONFIG: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

/// Nastaví zariadenie ako predvolené aj ako predvolené pre komunikáciu.
pub fn set_default(id: &str) -> Result<(), String> {
    unsafe {
        let pc: IPolicyConfig = CoCreateInstance(&CLSID_POLICY_CONFIG, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
        let w: Vec<u16> = id.encode_utf16().chain(std::iter::once(0)).collect();
        for role in [eConsole, eMultimedia, eCommunications] {
            pc.SetDefaultEndpoint(PCWSTR(w.as_ptr()), role).ok().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
