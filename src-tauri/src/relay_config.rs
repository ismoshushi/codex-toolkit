use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration as StdDuration,
};
use toml_edit::{value, DocumentMut, Item};

const DEFAULT_RELAY_PROVIDER: &str = "moapi";
const LEGACY_RELAY_PROVIDER: &str = "CodexViewerRelay";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelaySettings {
    pub enabled: bool,
    #[serde(default = "default_provider_id")]
    pub provider_id: String,
    pub base_url: String,
    pub api_key: String,
    pub test_model: Option<String>,
}

impl Default for RelaySettings {
    fn default() -> Self {
        Self {
            enabled: false,
            provider_id: default_provider_id(),
            base_url: String::new(),
            api_key: String::new(),
            test_model: None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayStatus {
    pub configured: bool,
    pub route: String,
    pub config_path: String,
    pub provider_id: String,
    pub base_url: Option<String>,
    pub has_base_url: bool,
    pub has_api_key: bool,
    pub masked_api_key: Option<String>,
    pub codex_running: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayApplyResult {
    pub config_path: String,
    pub backup_path: Option<String>,
    pub configured: bool,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestartResult {
    pub killed: bool,
    pub started: bool,
    pub app_path: Option<String>,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyAndRestartResult {
    pub apply: RelayApplyResult,
    pub restart: RestartResult,
}

pub fn load_relay_settings_from_default() -> Result<RelaySettings, String> {
    load_relay_settings_from_path(&relay_settings_path()?)
}

pub fn save_relay_settings_to_default(settings: RelaySettings) -> Result<RelaySettings, String> {
    save_relay_settings_to_path(&relay_settings_path()?, settings)
}

pub fn apply_relay_config_to_default(settings: RelaySettings) -> Result<RelayApplyResult, String> {
    apply_relay_config_to_home(&codex_home_dir()?, settings)
}

pub fn clear_relay_config_from_default() -> Result<RelayApplyResult, String> {
    let settings = load_relay_settings_from_default().unwrap_or_default();
    clear_relay_config_from_home(&codex_home_dir()?, &settings)
}

pub fn relay_status_from_default() -> Result<RelayStatus, String> {
    let settings = load_relay_settings_from_default().unwrap_or_default();
    Ok(relay_status_from_home(&codex_home_dir()?, &settings))
}

pub fn apply_relay_config_and_restart_default(
    settings: RelaySettings,
) -> Result<ApplyAndRestartResult, String> {
    let saved = save_relay_settings_to_default(settings)?;
    let apply = apply_relay_config_to_default(saved)?;
    let restart = restart_codex_app();
    Ok(ApplyAndRestartResult { apply, restart })
}

pub fn restart_codex_app() -> RestartResult {
    let app_path = codex_process_path();
    let was_running = codex_running();
    let killed = if was_running {
        stop_codex_processes()
    } else {
        false
    };

    if killed {
        thread::sleep(StdDuration::from_millis(1200));
    }

    let started = app_path
        .as_ref()
        .map(|path| Command::new(path).spawn().is_ok())
        .unwrap_or(false);

    let message = if started {
        "Codex App restarted.".to_string()
    } else if was_running {
        "Codex was closed, but the app path was unavailable. Please start Codex manually."
            .to_string()
    } else {
        "Codex App is not running and no launch path was found. Please start Codex manually."
            .to_string()
    };

    RestartResult {
        killed,
        started,
        app_path,
        message,
    }
}

fn home_dir() -> Result<PathBuf, String> {
    env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .map(PathBuf::from)
        .map_err(|_| "Unable to locate the user home directory".to_string())
}

fn codex_home_dir() -> Result<PathBuf, String> {
    Ok(home_dir()?.join(".codex"))
}

fn relay_settings_path() -> Result<PathBuf, String> {
    Ok(home_dir()?.join(".codexviewer").join("relay-settings.json"))
}

fn default_provider_id() -> String {
    DEFAULT_RELAY_PROVIDER.to_string()
}

fn load_relay_settings_from_path(path: &Path) -> Result<RelaySettings, String> {
    match fs::read_to_string(path) {
        Ok(contents) => {
            serde_json::from_str(&contents).map_err(|_| "Relay settings are invalid".to_string())
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(RelaySettings::default()),
        Err(error) => Err(error.to_string()),
    }
}

fn save_relay_settings_to_path(
    path: &Path,
    mut settings: RelaySettings,
) -> Result<RelaySettings, String> {
    normalize_settings(&mut settings);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let contents = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    fs::write(path, contents).map_err(|error| error.to_string())?;
    Ok(settings)
}

fn normalize_settings(settings: &mut RelaySettings) {
    settings.provider_id = normalize_provider_id(&settings.provider_id);
    settings.base_url = settings.base_url.trim().to_string();
    settings.api_key = settings.api_key.trim().to_string();
    settings.test_model = settings
        .test_model
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
}

fn validate_relay_settings(settings: &RelaySettings) -> Result<(), String> {
    if !settings.enabled {
        return Err("Relay is disabled.".to_string());
    }
    if !is_valid_provider_id(&settings.provider_id) {
        return Err(
            "Provider ID can only contain letters, numbers, underscore and hyphen.".to_string(),
        );
    }
    if settings.base_url.trim().is_empty() {
        return Err("API Base URL cannot be empty.".to_string());
    }
    if !settings.base_url.starts_with("http://") && !settings.base_url.starts_with("https://") {
        return Err("API Base URL must start with http:// or https://.".to_string());
    }
    if settings.api_key.trim().is_empty() {
        return Err("API Key cannot be empty.".to_string());
    }
    Ok(())
}

fn apply_relay_config_to_home(
    home: &Path,
    mut settings: RelaySettings,
) -> Result<RelayApplyResult, String> {
    normalize_settings(&mut settings);
    validate_relay_settings(&settings)?;
    fs::create_dir_all(home).map_err(|error| error.to_string())?;

    let config_path = home.join("config.toml");
    let existing = fs::read_to_string(&config_path).unwrap_or_default();
    let backup_path = backup_config_if_exists(&config_path)?;
    let updated = upsert_relay_provider(&existing, &settings)?;
    fs::write(&config_path, updated).map_err(|error| error.to_string())?;
    let status = relay_status_from_home(home, &settings);

    Ok(RelayApplyResult {
        config_path: config_path.to_string_lossy().to_string(),
        backup_path: backup_path.map(|path| path.to_string_lossy().to_string()),
        configured: status.configured,
        message: "Relay configuration applied. Restart Codex to use it.".to_string(),
    })
}

fn clear_relay_config_from_home(
    home: &Path,
    settings: &RelaySettings,
) -> Result<RelayApplyResult, String> {
    fs::create_dir_all(home).map_err(|error| error.to_string())?;
    let config_path = home.join("config.toml");
    let existing = fs::read_to_string(&config_path).unwrap_or_default();
    let backup_path = backup_config_if_exists(&config_path)?;
    let updated = remove_relay_provider(&existing, &normalize_provider_id(&settings.provider_id))?;
    fs::write(&config_path, updated).map_err(|error| error.to_string())?;
    let status = relay_status_from_home(home, settings);

    Ok(RelayApplyResult {
        config_path: config_path.to_string_lossy().to_string(),
        backup_path: backup_path.map(|path| path.to_string_lossy().to_string()),
        configured: status.configured,
        message: "Official endpoint restored. Restart Codex to use it.".to_string(),
    })
}

fn relay_status_from_home(home: &Path, settings: &RelaySettings) -> RelayStatus {
    let config_path = home.join("config.toml");
    let contents = fs::read_to_string(&config_path).unwrap_or_default();
    let configured_provider_id = configured_provider_id(&contents, settings);
    let provider = relay_provider_table(&contents, &configured_provider_id);
    let base_url = provider
        .as_ref()
        .and_then(|doc| doc.get("base_url"))
        .and_then(|item| item.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let has_base_url = provider
        .as_ref()
        .and_then(|doc| doc.get("base_url"))
        .and_then(|item| item.as_str())
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);
    let has_api_key = provider
        .as_ref()
        .and_then(|doc| doc.get("experimental_bearer_token"))
        .and_then(|item| item.as_str())
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);
    let configured = !configured_provider_id.is_empty() && has_base_url && has_api_key;

    RelayStatus {
        configured,
        route: if configured { "relay" } else { "official" }.to_string(),
        config_path: config_path.to_string_lossy().to_string(),
        provider_id: if configured_provider_id.is_empty() {
            normalize_provider_id(&settings.provider_id)
        } else {
            configured_provider_id
        },
        base_url,
        has_base_url,
        has_api_key,
        masked_api_key: mask_api_key(&settings.api_key),
        codex_running: codex_running(),
    }
}

fn parse_toml(contents: &str) -> Result<DocumentMut, String> {
    contents
        .parse::<DocumentMut>()
        .map_err(|_| "Codex config.toml is invalid.".to_string())
}

fn upsert_relay_provider(contents: &str, settings: &RelaySettings) -> Result<String, String> {
    let provider_id = normalize_provider_id(&settings.provider_id);
    let mut doc = if contents.trim().is_empty() {
        DocumentMut::new()
    } else {
        parse_toml(contents)?
    };

    doc["model_provider"] = value(provider_id.as_str());
    if settings.test_model.is_some() && doc.get("model").is_none() {
        doc["model"] = value(settings.test_model.as_ref().unwrap().as_str());
    }

    if !doc.as_table().contains_key("model_providers") || !doc["model_providers"].is_table() {
        doc["model_providers"] = toml_edit::table();
    }

    doc["model_providers"][provider_id.as_str()] = toml_edit::table();
    doc["model_providers"][provider_id.as_str()]["name"] = value(provider_id.as_str());
    doc["model_providers"][provider_id.as_str()]["wire_api"] = value("responses");
    doc["model_providers"][provider_id.as_str()]["requires_openai_auth"] = value(true);
    doc["model_providers"][provider_id.as_str()]["base_url"] = value(settings.base_url.as_str());
    doc["model_providers"][provider_id.as_str()]["experimental_bearer_token"] =
        value(settings.api_key.as_str());

    Ok(ensure_trailing_newline(doc.to_string()))
}

fn remove_relay_provider(contents: &str, provider_id: &str) -> Result<String, String> {
    let mut doc = if contents.trim().is_empty() {
        DocumentMut::new()
    } else {
        parse_toml(contents)?
    };

    let current_provider = doc
        .get("model_provider")
        .and_then(|item| item.as_str())
        .map(str::to_string);
    let owned_providers = [provider_id, DEFAULT_RELAY_PROVIDER, LEGACY_RELAY_PROVIDER];
    if current_provider
        .as_deref()
        .map(|provider| owned_providers.contains(&provider))
        .unwrap_or(false)
    {
        doc.as_table_mut().remove("model_provider");
    }

    if let Some(model_providers) = doc.get_mut("model_providers").and_then(Item::as_table_mut) {
        for provider in owned_providers {
            model_providers.remove(provider);
        }
        if model_providers.is_empty() {
            doc.as_table_mut().remove("model_providers");
        }
    }

    Ok(ensure_trailing_newline(doc.to_string()))
}

fn relay_provider_table(contents: &str, provider_id: &str) -> Option<toml_edit::Table> {
    let doc = parse_toml(contents).ok()?;
    doc.get("model_providers")?
        .as_table()?
        .get(provider_id)?
        .as_table()
        .cloned()
}

fn configured_provider_id(contents: &str, settings: &RelaySettings) -> String {
    let settings_provider_id = normalize_provider_id(&settings.provider_id);
    let root_provider = parse_toml(contents).ok().and_then(|doc| {
        doc.get("model_provider")
            .and_then(|item| item.as_str())
            .map(str::to_string)
    });

    match root_provider.as_deref() {
        Some(provider)
            if provider == settings_provider_id
                || provider == DEFAULT_RELAY_PROVIDER
                || provider == LEGACY_RELAY_PROVIDER =>
        {
            provider.to_string()
        }
        _ => String::new(),
    }
}

fn normalize_provider_id(provider_id: &str) -> String {
    let provider_id = provider_id.trim();
    if provider_id.is_empty() {
        default_provider_id()
    } else {
        provider_id.to_string()
    }
}

fn is_valid_provider_id(provider_id: &str) -> bool {
    !provider_id.is_empty()
        && provider_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '_' || character == '-'
        })
}

fn backup_config_if_exists(config_path: &Path) -> Result<Option<PathBuf>, String> {
    if !config_path.exists() {
        return Ok(None);
    }
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
    let backup_path =
        config_path.with_file_name(format!("config.toml.codexviewer-backup-{timestamp}"));
    fs::copy(config_path, &backup_path).map_err(|error| error.to_string())?;
    Ok(Some(backup_path))
}

fn ensure_trailing_newline(mut contents: String) -> String {
    if !contents.ends_with('\n') {
        contents.push('\n');
    }
    contents
}

fn mask_api_key(api_key: &str) -> Option<String> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return None;
    }
    let head: String = api_key.chars().take(2).collect();
    let tail: String = api_key
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    Some(format!("{head}...{tail}"))
}

#[cfg(target_os = "windows")]
fn codex_running() -> bool {
    powershell_output(
        "Get-Process | Where-Object { $_.ProcessName -eq 'Codex' -or $_.ProcessName -eq 'OpenAI Codex' } | Select-Object -First 1 -ExpandProperty ProcessName",
    )
    .map(|output| !output.trim().is_empty())
    .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn codex_running() -> bool {
    false
}

#[cfg(target_os = "windows")]
fn codex_process_path() -> Option<String> {
    powershell_output(
        "Get-Process | Where-Object { $_.ProcessName -eq 'Codex' -or $_.ProcessName -eq 'OpenAI Codex' } | Select-Object -First 1 -ExpandProperty Path",
    )
    .ok()
    .map(|output| output.trim().to_string())
    .filter(|output| !output.is_empty())
}

#[cfg(not(target_os = "windows"))]
fn codex_process_path() -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn stop_codex_processes() -> bool {
    powershell_output(
        "Get-Process | Where-Object { $_.ProcessName -eq 'Codex' -or $_.ProcessName -eq 'OpenAI Codex' } | Stop-Process -Force",
    )
    .is_ok()
}

#[cfg(not(target_os = "windows"))]
fn stop_codex_processes() -> bool {
    false
}

#[cfg(target_os = "windows")]
fn powershell_output(script: &str) -> Result<String, String> {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err("PowerShell command failed.".to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn relay_settings() -> RelaySettings {
        RelaySettings {
            enabled: true,
            provider_id: default_provider_id(),
            base_url: "https://relay.example.test/v1".to_string(),
            api_key: "sk-secret-value".to_string(),
            test_model: Some("gpt-5-mini".to_string()),
        }
    }

    #[test]
    fn apply_relay_config_creates_config_toml() {
        let temp = tempfile::tempdir().unwrap();
        let result = apply_relay_config_to_home(temp.path(), relay_settings()).unwrap();
        let config = fs::read_to_string(temp.path().join("config.toml")).unwrap();

        assert!(result.configured);
        assert!(result.backup_path.is_none());
        assert!(config.contains(r#"model_provider = "moapi""#));
        assert!(config.contains("[model_providers.moapi]"));
        assert!(config.contains(r#"base_url = "https://relay.example.test/v1""#));
        assert!(config.contains(r#"experimental_bearer_token = "sk-secret-value""#));
    }

    #[test]
    fn apply_relay_config_backs_up_existing_config() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(temp.path().join("config.toml"), r#"model = "gpt-5""#).unwrap();

        let result = apply_relay_config_to_home(temp.path(), relay_settings()).unwrap();

        assert!(result.backup_path.is_some());
        assert!(PathBuf::from(result.backup_path.unwrap()).exists());
    }

    #[test]
    fn apply_relay_config_preserves_unrelated_config() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(
            temp.path().join("config.toml"),
            r#"[features]
goals = true
"#,
        )
        .unwrap();

        apply_relay_config_to_home(temp.path(), relay_settings()).unwrap();
        let config = fs::read_to_string(temp.path().join("config.toml")).unwrap();

        assert!(config.contains("[features]"));
        assert!(config.contains("goals = true"));
        assert!(config.contains("[model_providers.moapi]"));
    }

    #[test]
    fn clear_relay_config_removes_provider() {
        let temp = tempfile::tempdir().unwrap();
        apply_relay_config_to_home(temp.path(), relay_settings()).unwrap();

        let result = clear_relay_config_from_home(temp.path(), &relay_settings()).unwrap();
        let config = fs::read_to_string(temp.path().join("config.toml")).unwrap();

        assert!(!result.configured);
        assert!(!config.contains("moapi"));
    }

    #[test]
    fn apply_relay_config_rejects_empty_base_url() {
        let temp = tempfile::tempdir().unwrap();
        let mut settings = relay_settings();
        settings.base_url = " ".to_string();

        let error = apply_relay_config_to_home(temp.path(), settings).unwrap_err();

        assert!(error.contains("Base URL"));
        assert!(!error.contains("sk-secret-value"));
    }

    #[test]
    fn apply_relay_config_rejects_empty_api_key_without_leaking_secret() {
        let temp = tempfile::tempdir().unwrap();
        let mut settings = relay_settings();
        settings.api_key = " ".to_string();

        let error = apply_relay_config_to_home(temp.path(), settings).unwrap_err();

        assert!(error.contains("API Key"));
        assert!(!error.contains("sk-secret-value"));
    }

    #[test]
    fn settings_roundtrip_persists_relay_settings() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("relay-settings.json");

        save_relay_settings_to_path(&path, relay_settings()).unwrap();
        let loaded = load_relay_settings_from_path(&path).unwrap();

        assert!(loaded.enabled);
        assert_eq!(loaded.base_url, "https://relay.example.test/v1");
        assert_eq!(loaded.api_key, "sk-secret-value");
        assert_eq!(loaded.provider_id, "moapi");
    }

    #[test]
    fn apply_relay_config_uses_custom_provider_id() {
        let temp = tempfile::tempdir().unwrap();
        let mut settings = relay_settings();
        settings.provider_id = "custom_provider".to_string();

        apply_relay_config_to_home(temp.path(), settings).unwrap();
        let config = fs::read_to_string(temp.path().join("config.toml")).unwrap();

        assert!(config.contains(r#"model_provider = "custom_provider""#));
        assert!(config.contains("[model_providers.custom_provider]"));
        assert!(config.contains(r#"name = "custom_provider""#));
    }
}
