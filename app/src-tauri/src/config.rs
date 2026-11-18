// Nastavenia MixItUp – %APPDATA%\MixItUp\config.json (appka zapisuje, engine číta pri zmene)
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const DEFAULT_CHAT: &[&str] = &[
    "discord", "discordptb", "discordcanary", "vesktop", "legcord", "teamspeak", "ts3client_win64", "ts3client_win32",
    "teamspeak6", "mumble", "ms-teams", "teams", "zoom", "slack", "skype", "whatsapp", "telegram", "guilded", "element",
];

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct Config {
    /// aplikácie v CHAT kanáli (názov procesu bez .exe, malými písmenami)
    pub chat: Vec<String>,
    /// aplikácie, na ktoré ChatMix nesiahne
    pub ignore: Vec<String>,
    /// koliesko funguje naopak
    pub swap: bool,
    /// ID výstupu, na ktorom ChatMix funguje; prázdne = automaticky slúchadlá Arctis
    pub output_id: String,
    /// ChatMix aj na ostatných výstupoch (ako v prototype); predvolene vypnuté
    pub all_outputs: bool,
    /// sprievodca prvým spustením je hotový
    pub setup_done: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            chat: DEFAULT_CHAT.iter().map(|s| s.to_string()).collect(),
            ignore: vec![],
            swap: false,
            output_id: String::new(),
            all_outputs: false,
            setup_done: false,
        }
    }
}

impl Config {
    pub fn is_chat(&self, app: &str) -> bool { self.chat.iter().any(|c| c.eq_ignore_ascii_case(app)) }
    pub fn is_ignored(&self, app: &str) -> bool { self.ignore.iter().any(|c| c.eq_ignore_ascii_case(app)) }
}

pub fn data_dir() -> PathBuf {
    PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| ".".into())).join("MixItUp")
}
pub fn config_path() -> PathBuf { data_dir().join("config.json") }
pub fn journal_path() -> PathBuf { data_dir().join("volumes.json") }

pub fn load() -> Config {
    std::fs::read_to_string(config_path())
        .ok()
        .and_then(|t| serde_json::from_str::<Config>(t.trim_start_matches('\u{feff}')).ok())
        .unwrap_or_default()
}

pub fn mtime() -> Option<std::time::SystemTime> {
    std::fs::metadata(config_path()).and_then(|m| m.modified()).ok()
}

pub fn save(cfg: &Config) -> Result<(), String> {
    let dir = data_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut c = cfg.clone();
    for list in [&mut c.chat, &mut c.ignore] {
        for s in list.iter_mut() {
            *s = s.trim().trim_end_matches(".exe").trim_end_matches(".EXE").to_lowercase();
        }
        list.retain(|s| !s.is_empty());
        list.sort();
        list.dedup();
    }
    let text = serde_json::to_string_pretty(&c).map_err(|e| e.to_string())?;
    let tmp = config_path().with_extension("json.tmp");
    std::fs::write(&tmp, text).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, config_path()).map_err(|e| e.to_string())
}
