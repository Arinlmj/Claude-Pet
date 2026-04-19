// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mcp_client;
mod state;

use std::path::PathBuf;
use std::sync::Mutex;
use chrono::TimeZone;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use state::AppState;

/// Calculate bottom-right position for the pet window
fn get_bottom_right_position(app_handle: &tauri::AppHandle) -> (f64, f64) {
    if let Ok(monitor) = app_handle.primary_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let window_width = 150.0;
            let window_height = 200.0;
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
        .setup(|app| {
            // Create the pet window (small floating window)
            let (x, y) = get_bottom_right_position(&app.handle());

            let pet_window = WebviewWindowBuilder::new(
                app,
                "pet",
                WebviewUrl::App("index.html".into()),
            )
            .title("Claude Pet")
            .inner_size(120.0, 120.0)
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
            get_claude_status,
            get_project_info,
            get_interaction_info,
            get_realtime_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_mini_chat(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    // Check if window already exists
    if app.get_webview_window("mini-chat").is_some() {
        if let Some(window) = app.get_webview_window("mini-chat") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // Create mini chat window near pet position
    let mini_window = WebviewWindowBuilder::new(
        &app,
        "mini-chat",
        WebviewUrl::App("index.html".into()),
    )
    .title("Claude Pet - Chat")
    .inner_size(380.0, 520.0)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .resizable(false)
    .position(x, y);

    #[cfg(target_os = "macos")]
    let mini_window = mini_window.title_bar_style(tauri::TitleBarStyle::Transparent);

    mini_window.build().map_err(|e| e.to_string())?;

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
            } else if entry.display.len() > 30 {
                format!("{}...", &entry.display[..30])
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
