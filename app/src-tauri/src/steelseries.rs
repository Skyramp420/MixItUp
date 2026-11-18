// Kontrola SteelSeries GG a Sonaru: či je nainštalované, či beží, či sa spúšťa pri štarte,
// či je Sonar predvolený výstup/mikrofón. A akcie na ich vypnutie (vratné).
use crate::audio;
use serde::Serialize;
use std::os::windows::process::CommandExt;
use windows::Win32::System::Diagnostics::ToolHelp::*;
use winreg::enums::*;
use winreg::RegKey;

const NO_WINDOW: u32 = 0x0800_0000;
const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN32: &str = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";
const APPROVED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved";

#[derive(Serialize, Clone)]
pub struct StartupItem {
    /// "hkcu" | "hklm" | "hklm32" | "folder" | "task"
    pub kind: String,
    pub name: String,
    pub command: String,
    pub enabled: bool,
}

#[derive(Serialize, Clone)]
pub struct Report {
    pub gg_installed: bool,
    pub gg_path: String,
    pub running: Vec<String>,
    pub startup: Vec<StartupItem>,
    pub sonar_present: bool,
    pub sonar_outputs: Vec<String>,
    pub default_output: audio::Endpoint,
    pub default_input: audio::Endpoint,
    pub output_is_sonar: bool,
    pub input_is_sonar: bool,
    pub endpoints: Vec<audio::Endpoint>,
}

fn has_ss(s: &str) -> bool { s.to_lowercase().contains("steelseries") }

pub fn gg_path() -> String {
    let pf = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".into());
    format!(r"{pf}\SteelSeries\GG\SteelSeriesGG.exe")
}

/// Bežiace procesy SteelSeries (bez služby na aktualizácie, tá beží ako systém a nič neprehráva).
pub fn running() -> Vec<String> {
    let mut out = Vec::new();
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else { return out };
        let mut e = PROCESSENTRY32W { dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32, ..Default::default() };
        if Process32FirstW(snap, &mut e).is_ok() {
            loop {
                let len = e.szExeFile.iter().position(|&c| c == 0).unwrap_or(e.szExeFile.len());
                let name = String::from_utf16_lossy(&e.szExeFile[..len]);
                let l = name.to_lowercase();
                if l.starts_with("steelseries") && !l.contains("updateservice") && !out.contains(&name) {
                    out.push(name);
                }
                if Process32NextW(snap, &mut e).is_err() { break; }
            }
        }
        let _ = windows::Win32::Foundation::CloseHandle(snap);
    }
    out.sort();
    out
}

fn approved_enabled(root: &RegKey, sub: &str, name: &str) -> bool {
    // Task Manager: prvý bajt párny = zapnuté, nepárny (03) = vypnuté; chýba = zapnuté
    root.open_subkey(format!(r"{APPROVED}\{sub}"))
        .and_then(|k| k.get_raw_value(name))
        .map(|v| v.bytes.first().map(|b| b & 1 == 0).unwrap_or(true))
        .unwrap_or(true)
}

fn startup_folder() -> std::path::PathBuf {
    std::path::PathBuf::from(std::env::var("APPDATA").unwrap_or_default()).join(r"Microsoft\Windows\Start Menu\Programs\Startup")
}

fn tasks() -> Vec<StartupItem> {
    let Ok(out) = std::process::Command::new("schtasks").args(["/query", "/fo", "csv", "/nh"]).creation_flags(NO_WINDOW).output() else { return vec![] };
    let text = String::from_utf8_lossy(&out.stdout);
    let mut v: Vec<StartupItem> = Vec::new();
    for line in text.lines() {
        let cols: Vec<&str> = line.split("\",\"").map(|c| c.trim_matches('"')).collect();
        if cols.len() < 3 || !has_ss(cols[0]) { continue; }
        if v.iter().any(|t| t.name == cols[0]) { continue; }
        let status = cols[2].to_lowercase();
        let disabled = status.contains("disabled") || status.contains("zakáz") || status.contains("vypn");
        v.push(StartupItem { kind: "task".into(), name: cols[0].into(), command: String::new(), enabled: !disabled });
    }
    v
}

pub fn startup_items() -> Vec<StartupItem> {
    let mut v = Vec::new();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for (root, path, kind, sub) in [(&hkcu, RUN, "hkcu", "Run"), (&hklm, RUN, "hklm", "Run"), (&hklm, RUN32, "hklm32", "Run32")] {
        let Ok(k) = root.open_subkey(path) else { continue };
        for (name, val) in k.enum_values().flatten() {
            let cmd = val.to_string();
            if has_ss(&name) || has_ss(&cmd) {
                v.push(StartupItem { kind: kind.into(), enabled: approved_enabled(root, sub, &name), name, command: cmd.trim_matches('"').into() });
            }
        }
    }
    if let Ok(rd) = std::fs::read_dir(startup_folder()) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if has_ss(&name) {
                v.push(StartupItem { kind: "folder".into(), enabled: approved_enabled(&hkcu, "StartupFolder", &name), name, command: String::new() });
            }
        }
    }
    v.extend(tasks());
    v
}

pub fn report() -> Report {
    let eps = audio::endpoints();
    let sonar_outputs: Vec<String> = eps.iter().filter(|e| e.sonar).map(|e| e.name.clone()).collect();
    let empty = audio::Endpoint { id: String::new(), name: String::new(), flow: String::new(), default: false, default_comm: false, sonar: false, arctis: false };
    let dout = eps.iter().find(|e| e.flow == "render" && e.default).cloned().unwrap_or_else(|| empty.clone());
    let din = eps.iter().find(|e| e.flow == "capture" && e.default).cloned().unwrap_or_else(|| empty.clone());
    let out_sonar = eps.iter().any(|e| e.flow == "render" && e.sonar && (e.default || e.default_comm));
    let in_sonar = eps.iter().any(|e| e.flow == "capture" && e.sonar && (e.default || e.default_comm));
    let path = gg_path();
    Report {
        gg_installed: std::path::Path::new(&path).exists(),
        gg_path: path,
        running: running(),
        startup: startup_items(),
        sonar_present: !sonar_outputs.is_empty(),
        sonar_outputs,
        output_is_sonar: out_sonar,
        input_is_sonar: in_sonar,
        default_output: dout,
        default_input: din,
        endpoints: eps,
    }
}

// ------------------------------------------------------------------ akcie

fn filetime_now() -> [u8; 8] {
    // FILETIME = 100 ns od 1.1.1601
    let unix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos() / 100).unwrap_or(0) as u64;
    (unix + 116_444_736_000_000_000).to_le_bytes()
}

fn approved_bytes(enabled: bool) -> Vec<u8> {
    let mut b = vec![if enabled { 0x02 } else { 0x03 }, 0, 0, 0];
    b.extend_from_slice(&if enabled { [0u8; 8] } else { filetime_now() });
    b
}

fn hex(b: &[u8]) -> String { b.iter().map(|x| format!("{x:02x}")).collect() }

/// Zapne/vypne autoštart SteelSeries rovnako ako Správca úloh (záznam ostane, len sa označí ako vypnutý).
pub fn set_startup(enabled: bool) -> Result<usize, String> {
    let items = startup_items();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut admin: Vec<String> = Vec::new();
    let mut n = 0;
    for it in items.iter().filter(|i| i.enabled != enabled) {
        let bytes = approved_bytes(enabled);
        match it.kind.as_str() {
            "hkcu" | "folder" => {
                let sub = if it.kind == "hkcu" { "Run" } else { "StartupFolder" };
                let (k, _) = hkcu.create_subkey(format!(r"{APPROVED}\{sub}")).map_err(|e| e.to_string())?;
                k.set_raw_value(&it.name, &winreg::RegValue { vtype: REG_BINARY, bytes: bytes.clone() }).map_err(|e| e.to_string())?;
                n += 1;
            }
            "hklm" | "hklm32" => {
                let sub = if it.kind == "hklm" { "Run" } else { "Run32" };
                admin.push(format!(
                    "reg add 'HKLM\\{APPROVED}\\{sub}' /v '{}' /t REG_BINARY /d {} /f | Out-Null",
                    it.name.replace('\'', "''"),
                    hex(&bytes)
                ));
                n += 1;
            }
            "task" => {
                admin.push(format!("schtasks /change /tn '{}' /{} | Out-Null", it.name.replace('\'', "''"), if enabled { "enable" } else { "disable" }));
                n += 1;
            }
            _ => {}
        }
    }
    if !admin.is_empty() { run_elevated(&admin.join("\r\n"))?; }
    Ok(n)
}

/// Ukončí bežiace SteelSeries GG (vrátane Sonaru).
pub fn stop_gg() -> Result<(), String> {
    let procs = running();
    if procs.is_empty() { return Ok(()); }
    let mut args: Vec<String> = vec!["/F".into(), "/T".into()];
    for p in &procs { args.push("/IM".into()); args.push(p.clone()); }
    let _ = std::process::Command::new("taskkill").args(&args).creation_flags(NO_WINDOW).output();
    std::thread::sleep(std::time::Duration::from_millis(600));
    let left = running();
    if !left.is_empty() {
        let list = left.iter().map(|p| format!("'{}'", p.trim_end_matches(".exe").replace('\'', "''"))).collect::<Vec<_>>().join(",");
        run_elevated(&format!("Stop-Process -Name {list} -Force -ErrorAction SilentlyContinue"))?;
    }
    Ok(())
}

/// Vypne/zapne virtuálne zvukové zariadenia Sonaru (zmiznú zo zoznamu výstupov). Pýta si admin práva.
pub fn set_sonar_devices(enabled: bool) -> Result<(), String> {
    let verb = if enabled { "Enable-PnpDevice" } else { "Disable-PnpDevice" };
    run_elevated(&format!(
        "Get-PnpDevice | Where-Object {{ $_.InstanceId -like 'ROOT\\VEN_SSGG*' -or $_.FriendlyName -like '*Sonar Virtual*' }} | {verb} -Confirm:$false -ErrorAction SilentlyContinue"
    ))
}

/// Spustí PowerShell skript s admin právami (UAC okno) a počká naň.
pub fn run_elevated(script: &str) -> Result<(), String> {
    use windows::core::{w, PCWSTR};
    use windows::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW};
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;
    use windows::Win32::System::Threading::{WaitForSingleObject, GetExitCodeProcess};

    let path = std::env::temp_dir().join(format!("mixitup-admin-{}.ps1", std::process::id()));
    std::fs::write(&path, format!("$ErrorActionPreference='Continue'\r\n{script}\r\n")).map_err(|e| e.to_string())?;
    let params = format!("-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"", path.display());
    let wparams: Vec<u16> = params.encode_utf16().chain(std::iter::once(0)).collect();
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS,
        lpVerb: w!("runas"),
        lpFile: w!("powershell.exe"),
        lpParameters: PCWSTR(wparams.as_ptr()),
        nShow: SW_HIDE.0,
        ..Default::default()
    };
    let res = unsafe { ShellExecuteExW(&mut info) };
    if res.is_err() {
        let _ = std::fs::remove_file(&path);
        return Err("Bez povolenia správcu sa to nedá. Skús znova a v okne Windowsu daj Áno.".into());
    }
    unsafe {
        if !info.hProcess.is_invalid() {
            WaitForSingleObject(info.hProcess, 60_000);
            let mut code = 0u32;
            let _ = GetExitCodeProcess(info.hProcess, &mut code);
            let _ = windows::Win32::Foundation::CloseHandle(info.hProcess);
        }
    }
    let _ = std::fs::remove_file(&path);
    Ok(())
}
