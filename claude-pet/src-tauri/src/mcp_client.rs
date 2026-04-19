use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncWriteExt, AsyncBufReadExt};

use crate::state::Message;

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
    message_session: Option<tokio::process::Child>,
    message_stdin:
        Option<tokio::io::Lines<tokio::io::BufReader<tokio::process::ChildStdout>>>,
}

impl Default for ClaudeCliManager {
    fn default() -> Self {
        Self {
            connected: false,
            current_state: "idle".to_string(),
            last_activity: "未知".to_string(),
            uptime_seconds: 0,
            message_session: None,
            message_stdin: None,
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

    /// 启动持久进程用于消息发送
    pub async fn start_message_session(&mut self) -> Result<(), String> {
        if self.message_session.is_some() {
            return Ok(());
        }

        let mut child = Command::new("claude")
            .args(["--session", "--json"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn claude session: {}", e))?;

        let stdout = child.stdout.take()
            .ok_or("Failed to take stdout")?;
        let reader = tokio::io::BufReader::new(stdout).lines();

        self.message_session = Some(child);
        self.message_stdin = Some(reader);
        self.connected = true;

        tracing::info!("Claude message session started");
        Ok(())
    }

    /// 通过持久进程发送消息
    pub async fn send_message(&mut self, content: &str) -> Result<Message, String> {
        if self.message_session.is_none() {
            self.start_message_session().await?;
        }

        let child = self.message_session.as_mut()
            .ok_or("No message session")?;

        let stdin = child.stdin.as_mut()
            .ok_or("No stdin")?;

        // 发送消息
        let request = serde_json::json!({
            "type": "user_message",
            "content": content
        });
        stdin.write_all(format!("{}\n", request).as_bytes())
            .await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;

        // 读取响应
        if let Some(ref mut lines) = self.message_stdin {
            match lines.next_line().await {
                Ok(Some(response)) => {
                    tracing::debug!("Message response: {}", response);

                    // 解析响应并返回 Message
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                        return Ok(Message {
                            id: json.get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string(),
                            role: json.get("role")
                                .and_then(|v| v.as_str())
                                .unwrap_or("assistant")
                                .to_string(),
                            content: json.get("content")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            timestamp: chrono::Utc::now()
                                .format("%Y-%m-%d %H:%M:%S")
                                .to_string(),
                        });
                    }
                }
                _ => {}
            }
        }

        Err("No response from claude".to_string())
    }

    /// 关闭消息会话
    pub async fn shutdown(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.message_session.take() {
            child.kill().await.map_err(|e| e.to_string())?;
            self.message_stdin = None;
            tracing::info!("Claude message session stopped");
        }
        Ok(())
    }
}
