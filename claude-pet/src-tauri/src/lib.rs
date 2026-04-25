// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mcp_client;
mod state;

use std::path::PathBuf;
use std::sync::Mutex;
use chrono::TimeZone;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc::channel;
use std::time::Duration;
use state::AppState;

/// Calculate bottom-right position for the pet window
fn get_bottom_right_position(app_handle: &tauri::AppHandle) -> (f64, f64) {
    if let Ok(monitor) = app_handle.primary_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let window_width = 320.0;
            let window_height = 180.0;
            let padding = 20.0;

            let x = (size.width as f64 / scale) - window_width - padding;
            let y = (size.height as f64 / scale) - window_height - padding;
            return (x, y);
        }
    }
    (1100.0, 650.0) // fallback
}

fn get_status_file_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude-pet")
        .join("status.json")
}

fn get_claude_socket_path() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let candidates = [
        home.join(".claude-code/socket"),
        home.join("Library/Caches/claude-code/socket"),
        home.join(".claude-pet/claude.sock"),
    ];

    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }
    None
}

fn setup_tool_status_watcher(app_handle: tauri::AppHandle) -> Result<(), String> {
    let path = std::path::PathBuf::from("/tmp/claude-pet-tool-status.json");

    // 确保文件存在
    if !path.exists() {
        std::fs::write(&path, "{}").map_err(|e| e.to_string())?;
    }

    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, _>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default().with_poll_interval(Duration::from_millis(500)),
    ).map_err(|e| e.to_string())?;

    watcher.watch(&path, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;

    // Spawn thread to handle events
    std::thread::spawn(move || {
        loop {
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(event) => {
                    if event.kind.is_modify() {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            if let Ok(tool_status) = serde_json::from_str::<state::ToolStatus>(&content) {
                                // 发送事件到前端
                                let _ = app_handle.emit("tool-status-changed", tool_status);
                            }
                        }
                    }
                }
                Err(_) => continue,
            }
        }
    });

    Ok(())
}

async fn read_messages_from_socket(
    socket_path: &PathBuf,
    session_id: &str,
) -> Result<Vec<state::Message>, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::UnixStream;

    let mut stream = UnixStream::connect(socket_path)
        .await
        .map_err(|e| e.to_string())?;

    let request = serde_json::json!({
        "type": "get_messages",
        "session_id": session_id
    });

    stream.write_all(request.to_string().as_bytes())
        .await
        .map_err(|e| e.to_string())?;

    let mut response = String::new();
    stream.read_to_string(&mut response)
        .await
        .map_err(|e| e.to_string())?;

    let messages: Vec<state::Message> = serde_json::from_str(&response)
        .map_err(|e| e.to_string())?;
    Ok(messages)
}

async fn read_status_file() -> Result<state::RealtimeStatus, String> {
    let path = get_status_file_path();
    if !path.exists() {
        return Ok(state::RealtimeStatus {
            connected: false,
            current_state: "idle".to_string(),
            uptime_seconds: 0,
            last_activity: "未知".to_string(),
            current_task: None,
            recent_activities: vec![],
        });
    }
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    let status: state::RealtimeStatus = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;
    Ok(status)
}

pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .manage(Mutex::new(AppState::new()))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Setup tool status watcher
            if let Err(e) = setup_tool_status_watcher(app.handle().clone()) {
                tracing::warn!("Failed to setup tool status watcher: {}", e);
            }
            // Create the pet window (small floating window)
            let (x, y) = get_bottom_right_position(&app.handle());

            let pet_window = WebviewWindowBuilder::new(
                app,
                "pet",
                WebviewUrl::App("index.html".into()),
            )
            .title("Claude Pet")
            .inner_size(320.0, 180.0)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(false)
            .resizable(true)
            .position(x, y);

            #[cfg(target_os = "macos")]
            let pet_window = pet_window.title_bar_style(tauri::TitleBarStyle::Transparent);

            let pet_window = pet_window.build()?;
            tracing::info!("Pet window built successfully");

            pet_window.show().map_err(|e| {
                tracing::error!("Failed to show window: {}", e);
                e.to_string()
            })?;
            tracing::info!("Pet window shown successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_mini_chat,
            close_mini_chat,
            get_sessions,
            get_messages,
            send_message,
            get_current_state,
            set_pet_state,
            set_active_session,
            get_active_session,
            get_claude_status,
            get_project_info,
            get_interaction_info,
            get_realtime_status,
            get_current_tool,
            notify_tool_completed,
            send_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_mini_chat(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    tracing::info!("open_mini_chat called with x={}, y={}", x, y);

    // Check if window already exists
    if app.get_webview_window("mini-chat").is_some() {
        tracing::info!("mini-chat window already exists, showing it");
        if let Some(window) = app.get_webview_window("mini-chat") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // Use primary monitor to calculate position
    let (final_x, final_y) = if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let screen_width = size.width as f64 / scale;
        let screen_height = size.height as f64 / scale;

        // Position to the left of pet (which is at x,y)
        // MiniChat is 380px wide, pet is ~120px, so offset by ~450px to the left
        let win_width = 380.0;
        let win_height = 520.0;
        let mut new_x = x - win_width - 120.0; // Put to the left of pet
        let mut new_y = y - 100.0; // Slightly above pet center

        // Ensure on screen
        if new_x < 50.0 { new_x = 50.0; }
        if new_x > screen_width - win_width - 50.0 { new_x = screen_width - win_width - 50.0; }
        if new_y < 50.0 { new_y = 50.0; }
        if new_y > screen_height - win_height - 50.0 { new_y = screen_height - win_height - 50.0; }

        tracing::info!("Screen: {}x{}, Pet pos: {}x{}, Final pos: {}x{}",
            screen_width, screen_height, x, y, new_x, new_y);
        (new_x, new_y)
    } else {
        (x.max(100.0), y.max(100.0))
    };

    tracing::info!("Creating new mini-chat window at x={}, y={}", final_x, final_y);
    // Create mini chat window near pet position
    let mini_window = WebviewWindowBuilder::new(
        &app,
        "mini-chat",
        WebviewUrl::External("http://localhost:1420".parse().unwrap()),
    )
    .title("Claude Pet - Chat")
    .inner_size(380.0, 520.0)
    .decorations(false)
    .transparent(false)  // Temporarily disabled for debugging
    .shadow(true)
    .always_on_top(true)
    .resizable(false)
    .position(final_x, final_y);

    #[cfg(target_os = "macos")]
    let mini_window = mini_window.title_bar_style(tauri::TitleBarStyle::Transparent);

    mini_window.build().map_err(|e| {
        tracing::error!("Failed to build mini-chat window: {}", e);
        e.to_string()
    })?;

    tracing::info!("mini-chat window built successfully");
    Ok(())
}

#[tauri::command]
async fn close_mini_chat(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("mini-chat") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_sessions() -> Result<Vec<state::Session>, String> {
    let history_path = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude")
        .join("history.jsonl");

    if !history_path.exists() {
        return Ok(vec![]);
    }

    let content = tokio::fs::read_to_string(&history_path)
        .await
        .map_err(|e| e.to_string())?;

    let mut sessions_map: std::collections::HashMap<String, state::Session> = std::collections::HashMap::new();

    for line in content.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(entry) = serde_json::from_str::<state::HistoryEntry>(line) {
            let session_id = entry.session_id.clone();
            let title = if entry.display.is_empty() {
                "新对话".to_string()
            } else if entry.display.chars().count() > 30 {
                format!("{}...", entry.display.chars().take(30).collect::<String>())
            } else {
                entry.display
            };

            let key = format!("{}:{}", session_id, entry.project);
            let timestamp = chrono::Utc.timestamp_millis_opt(entry.timestamp as i64)
                .single()
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_else(|| "未知时间".to_string());

            sessions_map.insert(key, state::Session {
                id: session_id,
                title,
                updated_at: timestamp,
            });
        }
    }

    let mut sessions: Vec<state::Session> = sessions_map.into_values().collect();
    sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(sessions)
}

#[tauri::command]
async fn get_messages(session_id: String) -> Result<Vec<state::Message>, String> {
    // 尝试通过 socket 获取消息（如果未来 Claude Code 支持）
    if let Some(socket_path) = get_claude_socket_path() {
        if let Ok(messages) = read_messages_from_socket(&socket_path, &session_id).await {
            if !messages.is_empty() {
                return Ok(messages);
            }
        }
    }

    // Fallback: 从 history.jsonl 读取该会话的消息
    let history_path = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude")
        .join("history.jsonl");

    if history_path.exists() {
        let content = tokio::fs::read_to_string(&history_path)
            .await
            .map_err(|e| e.to_string())?;

        let mut messages = Vec::new();
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(entry) = serde_json::from_str::<serde_json::Value>(line) {
                let entry_session = entry.get("session_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if entry_session == session_id {
                    let role = entry.get("type")
                        .and_then(|v| v.as_str())
                        .unwrap_or("user");
                    let role_str = if role == "assistant" || role == "assistant_response" {
                        "assistant"
                    } else {
                        "user"
                    };
                    messages.push(state::Message {
                        id: entry.get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                            .to_string(),
                        role: role_str.to_string(),
                        content: entry.get("display")
                            .or_else(|| entry.get("content"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        timestamp: entry.get("timestamp")
                            .and_then(|v| v.as_i64())
                            .map(|ts| {
                                chrono::Utc.timestamp_millis_opt(ts)
                                    .single()
                                    .map(|dt| dt.format("%H:%M").to_string())
                                    .unwrap_or_default()
                            })
                            .unwrap_or_default(),
                    });
                }
            }
        }

        if !messages.is_empty() {
            return Ok(messages);
        }
    }

    // 最终 Fallback: 模拟消息
    Ok(vec![
        state::Message {
            id: "1".to_string(),
            role: "user".to_string(),
            content: "显示最近会话".to_string(),
            timestamp: "刚刚".to_string(),
        },
        state::Message {
            id: "2".to_string(),
            role: "assistant".to_string(),
            content: "好的，这是您的会话列表。".to_string(),
            timestamp: "刚刚".to_string(),
        },
    ])
}

async fn send_message_via_socket(
    socket_path: &PathBuf,
    session_id: &str,
    content: &str,
) -> Result<state::Message, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::UnixStream;

    let mut stream = UnixStream::connect(socket_path)
        .await
        .map_err(|e| e.to_string())?;

    let request = serde_json::json!({
        "type": "send_message",
        "session_id": session_id,
        "content": content
    });

    stream.write_all(request.to_string().as_bytes())
        .await
        .map_err(|e| e.to_string())?;

    let mut response = String::new();
    stream.read_to_string(&mut response)
        .await
        .map_err(|e| e.to_string())?;

    let msg: state::Message = serde_json::from_str(&response)
        .map_err(|e| e.to_string())?;
    Ok(msg)
}

#[tauri::command]
async fn send_message(
    state: tauri::State<'_, Mutex<AppState>>,
    _session_id: String,
    content: String,
) -> Result<state::Message, String> {
    let content_clone = content.clone();
    let claude_manager = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.claude_manager.clone()
    };

    let mut manager = claude_manager.lock().await;
    match manager.send_message(&content_clone).await {
        Ok(msg) => Ok(msg),
        Err(e) => {
            tracing::warn!("send_message failed: {}, using fallback", e);
            // Fallback: 模拟发送
            Ok(state::Message {
                id: format!("{}", std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()),
                role: "user".to_string(),
                content,
                timestamp: "刚刚".to_string(),
            })
        }
    }
}

#[tauri::command]
async fn get_current_state(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    // Clone the Arc to avoid borrowing app_state across await
    let claude_manager = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.claude_manager.clone()
    };

    // Now poll status with the cloned manager
    let status = {
        let mut manager = claude_manager.lock().await;
        manager.poll_status().await.unwrap_or_else(|e| {
            tracing::error!("poll_status error: {}", e);
            mcp_client::ClaudeStatus {
                connected: false,
                current_state: "error".to_string(),
                uptime_seconds: 0,
                last_activity: "错误".to_string(),
                current_task: None,
                recent_activities: vec![],
            }
        })
    };

    // Update app_state after polling
    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.current_state = status.current_state.clone();
    }

    Ok(status.current_state)
}

#[tauri::command]
async fn set_pet_state(state: tauri::State<'_, Mutex<AppState>>, new_state: String) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.current_state = new_state;
    Ok(())
}

#[tauri::command]
async fn set_active_session(state: tauri::State<'_, Mutex<AppState>>, session_id: Option<String>) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    app_state.active_session_id = session_id;
    Ok(())
}

#[tauri::command]
async fn get_active_session(state: tauri::State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.active_session_id.clone())
}

#[tauri::command]
async fn get_claude_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<state::ClaudeStatus, String> {
    let claude_manager = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.claude_manager.clone()
    };

    let mcp_status = {
        let mut manager = claude_manager.lock().await;
        manager.poll_status().await.map_err(|e| e.to_string())?
    };

    Ok(state::ClaudeStatus {
        connected: mcp_status.connected,
        current_state: mcp_status.current_state,
        uptime_seconds: mcp_status.uptime_seconds,
        last_activity: mcp_status.last_activity,
    })
}

#[tauri::command]
async fn get_project_info() -> Result<state::ProjectInfo, String> {
    // TODO: Get real project info
    Ok(state::ProjectInfo {
        name: "claude-pet".to_string(),
        path: "/Users/jun/Documents/dev/env/workspace/claude-pet".to_string(),
    })
}

#[tauri::command]
async fn get_interaction_info() -> Result<state::InteractionInfo, String> {
    // TODO: Get real interaction info from MCP client
    // 这里返回模拟数据，实际需要从 MCP client 获取
    Ok(state::InteractionInfo {
        current_task: Some(state::CurrentTask {
            tool_name: Some("Read".to_string()),
            message_preview: Some("正在读取 src/App.tsx 文件...".to_string()),
            progress: Some("读取中".to_string()),
        }),
        recent_message: Some("帮我查看项目结构".to_string()),
        message_count: 5,
    })
}

#[tauri::command]
async fn get_realtime_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<mcp_client::ClaudeStatus, String> {
    // Clone the Arc to avoid borrowing app_state across await
    let claude_manager = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.claude_manager.clone()
    };

    // Poll status with the cloned manager
    let mut manager = claude_manager.lock().await;
    manager.poll_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_current_tool(state: tauri::State<'_, Mutex<AppState>>) -> Result<Option<state::ToolStatus>, String> {
    let active_session_id = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.active_session_id.clone()
    };

    let path = std::path::PathBuf::from("/tmp/claude-pet-tool-status.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;

    // 先尝试正常解析 JSON
    if let Ok(tool_status) = serde_json::from_str::<state::ToolStatus>(&content) {
        // 如果工具名称为空，返回 None
        if tool_status.tool_name.is_empty() {
            return Ok(None);
        }

        // 如果工具状态超过 10 秒没有更新，认为已结束
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        if now > tool_status.timestamp as u64 + 10 {
            return Ok(None);
        }

        // 如果有活动会话 ID，检查是否匹配
        if let Some(ref active_id) = active_session_id {
            if let Some(ref tool_session_id) = tool_status.session_id {
                // 如果 session_id 是 "unknown"，不过滤（显示工具）
                if tool_session_id != "unknown" && tool_session_id != active_id {
                    // 会话不匹配，返回 None（不显示）
                    return Ok(None);
                }
            } else {
                // 工具没有 session_id，但我们有活动的会话，不匹配
                return Ok(None);
            }
        }

        return Ok(Some(tool_status));
    }

    // JSON 解析失败，尝试手动提取 tool_name
    // 匹配 "tool_name":"xxx" 或 "tool_name": "xxx"
    if let Some(tool_name_start) = content.find("\"tool_name\"") {
        let after_name = &content[tool_name_start + 12..];
        if let Some(colon_pos) = after_name.find(':') {
            let after_colon = &after_name[colon_pos + 1..];
            let trimmed = after_colon.trim_start();
            if trimmed.starts_with('"') {
                if let Some(end_quote) = trimmed[1..].find('"') {
                    let tool_name = &trimmed[1..1 + end_quote];
                    if !tool_name.is_empty() {
                        // 尝试提取 details
                        let details = if let Some(details_start) = content.find("\"details\"") {
                            let after_details = &content[details_start + 10..];
                            if let Some(dcolon) = after_details.find(':') {
                                let after_dcolon = after_details[dcolon + 1..].trim_start();
                                if after_dcolon.starts_with('"') {
                                    let after_quote = &after_dcolon[1..];
                                    // 找到下一个引号之前的内容
                                    let details = after_quote.split('"').next().unwrap_or("");
                                    Some(details.to_string())
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                        // 尝试提取 timestamp
                        let timestamp = if let Some(ts_start) = content.find("\"timestamp\"") {
                            let after_ts = &content[ts_start + 12..];
                            if let Some(ts_colon) = after_ts.find(':') {
                                let after_ts_colon = after_ts[ts_colon + 1..].trim();
                                after_ts_colon.split(|c: char| !c.is_numeric()).next()
                                    .and_then(|s| s.parse::<u64>().ok())
                                    .unwrap_or(0)
                            } else {
                                0
                            }
                        } else {
                            0
                        };

                        // 尝试提取 session_id
                        let session_id = if let Some(sid_start) = content.find("\"session_id\"") {
                            let after_sid = &content[sid_start + 13..];
                            if let Some(sid_colon) = after_sid.find(':') {
                                let after_sid_colon = after_sid[sid_colon + 1..].trim_start();
                                if after_sid_colon.starts_with('"') {
                                    let after_quote = &after_sid_colon[1..];
                                    let sid = after_quote.split('"').next().unwrap_or("unknown");
                                    // 保持 "unknown" 为 Some("unknown")，让后续过滤器决定是否显示
                                    if sid.is_empty() {
                                        None
                                    } else {
                                        Some(sid.to_string())
                                    }
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                        // 会话过滤检查
                        if let Some(ref active_id) = active_session_id {
                            if let Some(ref tool_session_id) = session_id {
                                // 如果 session_id 是 "unknown"，不过滤
                                if tool_session_id != "unknown" && tool_session_id != active_id {
                                    return Ok(None);
                                }
                            } else {
                                return Ok(None);
                            }
                        }

                        return Ok(Some(state::ToolStatus {
                            tool_name: tool_name.to_string(),
                            details,
                            timestamp,
                            session_id,
                        }));
                    }
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
async fn send_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 当工具执行完毕时，前端调用此命令发送通知
#[tauri::command]
async fn notify_tool_completed(
    app: tauri::AppHandle,
    session_id: Option<String>,
    tool_name: String,
    details: Option<String>,
) -> Result<(), String> {
    let session_label = session_id
        .map(|id| {
            // 截取 session_id 的前 8 位作为标识
            if id.len() > 8 {
                format!("会话{}", &id[..8])
            } else {
                format!("会话{}", id)
            }
        })
        .unwrap_or_else(|| "某会话".to_string());

    let detail_text = details
        .map(|d| format!(" - {}", d))
        .unwrap_or_default();

    let title = "✅ 任务执行完成";
    let body = format!("{}{} 已完成", session_label, detail_text);

    app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    tracing::info!("Tool completed notification sent: {} - {}{}", session_label, tool_name, detail_text);
    Ok(())
}
