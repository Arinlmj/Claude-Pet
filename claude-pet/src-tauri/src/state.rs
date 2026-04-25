use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::mcp_client::ClaudeCliManager;

#[derive(Default)]
pub struct AppState {
    pub current_state: String,
    pub claude_manager: Arc<Mutex<ClaudeCliManager>>,
    pub active_session_id: Option<String>,  // 当前活动的会话 ID
    pub last_tool_session_id: Option<String>,  // 上一个工具的会话 ID（用于完成通知）
    pub last_tool_name: Option<String>,  // 上一个工具名称（用于完成通知）
}

impl AppState {
    pub fn new() -> Self {
        Self {
            current_state: "idle".to_string(),
            claude_manager: Arc::new(Mutex::new(ClaudeCliManager::new())),
            active_session_id: None,
            last_tool_session_id: None,
            last_tool_name: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeStatus {
    pub connected: bool,
    pub current_state: String,
    pub uptime_seconds: u64,
    pub last_activity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTask {
    pub tool_name: Option<String>,
    pub message_preview: Option<String>,
    pub progress: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionInfo {
    pub current_task: Option<CurrentTask>,
    pub recent_message: Option<String>,
    pub message_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub tool: String,
    pub description: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeStatus {
    pub connected: bool,
    pub current_state: String,
    pub uptime_seconds: u64,
    pub last_activity: String,
    pub current_task: Option<CurrentTask>,
    pub recent_activities: Vec<Activity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub display: String,
    pub pasted_contents: serde_json::Value,
    pub timestamp: u64,
    pub project: String,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub tool_name: String,
    pub details: Option<String>,
    pub timestamp: u64,
    pub session_id: Option<String>,  // 新增：关联的会话 ID
}
