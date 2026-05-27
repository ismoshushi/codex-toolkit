use chrono::{DateTime, Duration, Utc};
use serde::Serialize;
use serde_json::Value;
use std::{
    env,
    fs::{self, File},
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

mod relay_config;

#[derive(Clone, Serialize)]
struct TokenUsage {
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    reasoning_output_tokens: u64,
    total_tokens: u64,
}

#[derive(Clone, Serialize)]
struct RateLimitState {
    used_percent: f64,
    window_minutes: i64,
    resets_at: i64,
}

#[derive(Clone, Serialize)]
struct UsageSnapshot {
    generated_at: i64,
    last_event_at: i64,
    plan_type: String,
    source_label: String,
    primary: RateLimitState,
    secondary: RateLimitState,
    total_usage: Option<TokenUsage>,
    last_usage: Option<TokenUsage>,
    hourly_primary_percents: Vec<f64>,
    weekly_secondary_percents: Vec<f64>,
    event_count: usize,
    scanned_files: usize,
    model_context_window: Option<u64>,
}

#[derive(Clone)]
struct UsageEvent {
    timestamp: DateTime<Utc>,
    plan_type: String,
    primary: RateLimitState,
    secondary: RateLimitState,
    total_usage: Option<TokenUsage>,
    last_usage: Option<TokenUsage>,
    model_context_window: Option<u64>,
}

fn parse_usage(value: &Value) -> Option<TokenUsage> {
    Some(TokenUsage {
        input_tokens: value.get("input_tokens")?.as_u64()?,
        cached_input_tokens: value.get("cached_input_tokens")?.as_u64()?,
        output_tokens: value.get("output_tokens")?.as_u64()?,
        reasoning_output_tokens: value.get("reasoning_output_tokens")?.as_u64()?,
        total_tokens: value.get("total_tokens")?.as_u64()?,
    })
}

fn parse_rate_limit(value: &Value) -> Option<RateLimitState> {
    Some(RateLimitState {
        used_percent: value.get("used_percent")?.as_f64()?,
        window_minutes: value.get("window_minutes")?.as_i64()?,
        resets_at: value.get("resets_at")?.as_i64()?,
    })
}

fn parse_event(line: &str) -> Option<UsageEvent> {
    let value: Value = serde_json::from_str(line).ok()?;
    let timestamp = value.get("timestamp")?.as_str()?;
    let parsed_time = DateTime::parse_from_rfc3339(timestamp).ok()?;
    let payload = value.get("payload")?;

    if payload.get("type")?.as_str()? != "token_count" {
        return None;
    }

    let rate_limits = payload.get("rate_limits")?;
    let info = payload.get("info");

    Some(UsageEvent {
        timestamp: parsed_time.with_timezone(&Utc),
        plan_type: rate_limits
            .get("plan_type")
            .and_then(Value::as_str)
            .unwrap_or("unknown")
            .to_string(),
        primary: parse_rate_limit(rate_limits.get("primary")?)?,
        secondary: parse_rate_limit(rate_limits.get("secondary")?)?,
        total_usage: info
            .and_then(|item| item.get("total_token_usage"))
            .and_then(parse_usage),
        last_usage: info
            .and_then(|item| item.get("last_token_usage"))
            .and_then(parse_usage),
        model_context_window: info
            .and_then(|item| item.get("model_context_window"))
            .and_then(Value::as_u64),
    })
}

fn visit_jsonl_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|error| error.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            visit_jsonl_files(&path, files)?;
        } else if path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
            files.push(path);
        }
    }

    Ok(())
}

fn resolve_sessions_dir(custom_dir: Option<String>) -> Result<PathBuf, String> {
    match custom_dir {
        Some(dir) if !dir.trim().is_empty() => Ok(PathBuf::from(dir)),
        _ => env::var("USERPROFILE")
            .or_else(|_| env::var("HOME"))
            .map(PathBuf::from)
            .map(|home| home.join(".codex").join("sessions"))
            .map_err(|_| "Unable to locate the user home directory".to_string()),
    }
}

fn load_events(custom_dir: Option<String>) -> Result<(Vec<UsageEvent>, usize, PathBuf), String> {
    let sessions_dir = resolve_sessions_dir(custom_dir)?;

    if !sessions_dir.exists() {
        return Err(format!(
            "Could not find Codex session logs at {}",
            sessions_dir.display()
        ));
    }

    let mut files = Vec::new();
    visit_jsonl_files(&sessions_dir, &mut files)?;
    files.sort();

    let mut events = Vec::new();

    for file_path in &files {
        let file = match File::open(file_path) {
            Ok(file) => file,
            Err(_) => continue,
        };
        let reader = BufReader::new(file);

        for line in reader.lines().map_while(Result::ok) {
            if let Some(event) = parse_event(&line) {
                events.push(event);
            }
        }
    }

    events.sort_by_key(|event| event.timestamp.timestamp());

    Ok((events, files.len(), sessions_dir))
}

fn latest_event_before(events: &[UsageEvent], target: DateTime<Utc>) -> Option<&UsageEvent> {
    events.iter().rev().find(|event| event.timestamp <= target)
}

fn build_hourly_series(events: &[UsageEvent], now: DateTime<Utc>) -> Vec<f64> {
    (0..24)
        .map(|index| {
            let slot_end = now - Duration::hours((23 - index) as i64);
            latest_event_before(events, slot_end)
                .map(|event| event.primary.used_percent)
                .unwrap_or(0.0)
        })
        .collect()
}

fn build_weekly_series(events: &[UsageEvent], now: DateTime<Utc>) -> Vec<f64> {
    let today = now.date_naive();

    (0..7)
        .map(|index| {
            let day = today - Duration::days((6 - index) as i64);
            let day_end = day.and_hms_opt(23, 59, 59).unwrap().and_utc();
            latest_event_before(events, day_end)
                .map(|event| event.secondary.used_percent)
                .unwrap_or(0.0)
        })
        .collect()
}

fn build_snapshot(custom_dir: Option<String>) -> Result<UsageSnapshot, String> {
    let (events, scanned_files, sessions_dir) = load_events(custom_dir)?;
    let latest = events
        .last()
        .cloned()
        .ok_or_else(|| "No Codex usage events were found".to_string())?;
    let now = Utc::now();

    Ok(UsageSnapshot {
        generated_at: now.timestamp(),
        last_event_at: latest.timestamp.timestamp(),
        plan_type: latest.plan_type,
        source_label: sessions_dir.display().to_string(),
        primary: latest.primary,
        secondary: latest.secondary,
        total_usage: latest.total_usage,
        last_usage: latest.last_usage,
        hourly_primary_percents: build_hourly_series(&events, now),
        weekly_secondary_percents: build_weekly_series(&events, now),
        event_count: events.len(),
        scanned_files,
        model_context_window: latest.model_context_window,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_token_count_event_with_usage_fields() {
        let line = r#"{"timestamp":"2026-04-24T12:34:56.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":1200,"cached_input_tokens":800,"output_tokens":240,"reasoning_output_tokens":32,"total_tokens":1440},"last_token_usage":{"input_tokens":300,"cached_input_tokens":120,"output_tokens":90,"reasoning_output_tokens":12,"total_tokens":390},"model_context_window":258400},"rate_limits":{"plan_type":"plus","primary":{"used_percent":47.0,"window_minutes":300,"resets_at":1777000000},"secondary":{"used_percent":24.0,"window_minutes":10080,"resets_at":1777600000}}}}"#;

        let event = parse_event(line).expect("event should parse");

        assert_eq!(event.plan_type, "plus");
        assert_eq!(event.primary.window_minutes, 300);
        assert_eq!(event.secondary.window_minutes, 10080);
        assert_eq!(event.total_usage.as_ref().unwrap().total_tokens, 1440);
        assert_eq!(event.last_usage.as_ref().unwrap().total_tokens, 390);
        assert_eq!(event.model_context_window, Some(258400));
    }

    #[test]
    fn ignores_non_token_count_events() {
        let line = r#"{"timestamp":"2026-04-24T12:34:56.000Z","type":"event_msg","payload":{"type":"agent_message","message":"hello"}}"#;
        assert!(parse_event(line).is_none());
    }
}

#[tauri::command]
fn load_usage_snapshot(sessions_dir: Option<String>) -> Result<UsageSnapshot, String> {
    build_snapshot(sessions_dir)
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn load_relay_settings() -> Result<relay_config::RelaySettings, String> {
    relay_config::load_relay_settings_from_default()
}

#[tauri::command]
fn save_relay_settings(
    settings: relay_config::RelaySettings,
) -> Result<relay_config::RelaySettings, String> {
    relay_config::save_relay_settings_to_default(settings)
}

#[tauri::command]
fn apply_relay_config(
    settings: relay_config::RelaySettings,
) -> Result<relay_config::RelayApplyResult, String> {
    relay_config::apply_relay_config_to_default(settings)
}

#[tauri::command]
fn clear_relay_config() -> Result<relay_config::RelayApplyResult, String> {
    relay_config::clear_relay_config_from_default()
}

#[tauri::command]
fn relay_status() -> Result<relay_config::RelayStatus, String> {
    relay_config::relay_status_from_default()
}

#[tauri::command]
fn restart_codex_app() -> relay_config::RestartResult {
    relay_config::restart_codex_app()
}

#[tauri::command]
fn apply_relay_config_and_restart(
    settings: relay_config::RelaySettings,
) -> Result<relay_config::ApplyAndRestartResult, String> {
    relay_config::apply_relay_config_and_restart_default(settings)
}

fn restore_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.set_skip_taskbar(false);
                let _ = window.minimize();
            }
        })
        .setup(|app| {
            let show_item =
                MenuItem::with_id(app, "show", "Show Codex Toolkit", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .tooltip("Codex Toolkit")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => restore_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        restore_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            let _tray = tray_builder.build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_skip_taskbar(false);

                if env::args().any(|arg| arg == "--autostart") {
                    let _ = window.hide();
                } else {
                    let _ = window.unminimize();
                    let _ = window.center();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_usage_snapshot,
            quit_app,
            load_relay_settings,
            save_relay_settings,
            apply_relay_config,
            clear_relay_config,
            relay_status,
            restart_codex_app,
            apply_relay_config_and_restart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
