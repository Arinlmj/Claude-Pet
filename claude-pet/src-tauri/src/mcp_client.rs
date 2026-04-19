use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTask {
    pub tool_name: Option<String>,
    pub message_preview: Option<String>,
    pub progress: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub tool: String,
    pub description: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
    pub connected: bool,
    pub current_state: String,
    pub uptime_seconds: u64,
    pub last_activity: String,
    pub current_task: Option<CurrentTask>,
    pub recent_activities: Vec<Activity>,
}

pub struct ClaudeCliManager {
    connected: bool,
    current_state: String,
    last_activity: String,
    uptime_seconds: u64,
}

impl Default for ClaudeCliManager {
    fn default() -> Self {
        Self {
            connected: false,
            current_state: "idle".to_string(),
            last_activity: "未知".to_string(),
            uptime_seconds: 0,
        }
    }
}

impl ClaudeCliManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// 通过 claude --print 获取 Claude Code 状态
    pub async fn poll_status(&mut self) -> Result<ClaudeStatus, String> {
        let output = Command::new("claude")
            .args(["--print", "--output-format", "json", "-p", "status"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute claude: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("claude --print failed: {}", stderr);
            return Ok(ClaudeStatus {
                connected: false,
                current_state: "error".to_string(),
                uptime_seconds: self.uptime_seconds,
                last_activity: self.last_activity.clone(),
                current_task: None,
                recent_activities: vec![],
            });
        }

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        tracing::debug!("claude --print output: {}", stdout);

        match serde_json::from_str::<serde_json::Value>(&stdout) {
            Ok(json) => {
                self.connected = true;
                let state = json.get("state")
                    .or_else(|| json.get("status"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("idle")
                    .to_string();
                self.current_state = state.clone();

                Ok(ClaudeStatus {
                    connected: true,
                    current_state: state,
                    uptime_seconds: self.uptime_seconds,
                    last_activity: self.last_activity.clone(),
                    current_task: None,
                    recent_activities: vec![],
                })
            }
            Err(e) => {
                tracing::warn!("Failed to parse claude output: {}", e);
                Ok(ClaudeStatus {
                    connected: false,
                    current_state: "error".to_string(),
                    uptime_seconds: self.uptime_seconds,
                    last_activity: self.last_activity.clone(),
                    current_task: None,
                    recent_activities: vec![],
                })
            }
        }
    }

    pub fn is_connected(&self) -> bool {
        self.connected
    }

    pub fn get_current_state(&self) -> String {
        self.current_state.clone()
    }
}
