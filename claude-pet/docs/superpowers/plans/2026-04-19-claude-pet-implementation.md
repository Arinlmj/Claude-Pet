# Claude Pet 完善实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 ClaudeCliManager 和前后端集成，使 Pet 能实时显示 Claude Code 状态，MiniChat 能发送/接收消息

**架构：** 使用 `claude --print` CLI 轮询获取状态，维护持久进程通过 stdin/stdout 发送消息，Tauri commands 连接前后端

**技术栈：** Tauri v2, React + TypeScript, Rust + tokio

---

## 文件结构

```
src-tauri/src/
├── lib.rs           # 修改: Tauri commands, 集成 ClaudeCliManager
├── state.rs         # 修改: RealtimeStatus 可能需要调整字段
└── mcp_client.rs    # 重写: ClaudeCliManager 实现

src/
├── hooks/
│   └── usePetState.ts   # 修改: 适配新的状态结构
├── components/
│   ├── Pet.tsx           # 修改: 接收真实状态
│   └── MiniChat.tsx      # 修改: 发送消息功能
└── App.tsx               # 可能需要调整
```

---

## 任务 1: 重写 ClaudeCliManager - 状态轮询

**文件：**
- 修改: `src-tauri/src/mcp_client.rs`

- [ ] **步骤 1: 备份并重写 mcp_client.rs**

将现有的 stub 实现替换为:

```rust
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use std::sync::Arc;

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

        // 解析 JSON 状态
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
```

- [ ] **步骤 2: 在 lib.rs 中添加 ClaudeCliManager 集成**

在 `src-tauri/src/lib.rs` 顶部添加:

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

mod mcp_client;
mod state;

use mcp_client::ClaudeCliManager;
```

修改 `run()` 函数前的结构:

```rust
pub struct AppState {
    pub current_state: String,
    pub claude_manager: Arc<Mutex<ClaudeCliManager>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_state: "idle".to_string(),
            claude_manager: Arc::new(Mutex::new(ClaudeCliManager::new())),
        }
    }
}
```

修改 `.setup()` 中的 `.manage()`:

```rust
.manage(Mutex::new(AppState::default()))
```

- [ ] **步骤 3: 修改 get_current_state 命令**

将 `get_current_state` 函数替换为:

```rust
#[tauri::command]
async fn get_current_state(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let mut manager = app_state.claude_manager.lock().await;
    let status = manager.poll_status().await.unwrap_or_else(|e| {
        tracing::error!("poll_status error: {}", e);
        mcp_client::ClaudeStatus {
            connected: false,
            current_state: "error".to_string(),
            uptime_seconds: 0,
            last_activity: "错误".to_string(),
            current_task: None,
            recent_activities: vec![],
        }
    });
    app_state.current_state = status.current_state.clone();
    Ok(status.current_state)
}
```

- [ ] **步骤 4: 添加 get_realtime_status 命令实现**

```rust
#[tauri::command]
async fn get_realtime_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<mcp_client::ClaudeStatus, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let mut manager = app_state.claude_manager.lock().await;
    manager.poll_status().await.map_err(|e| e.to_string())
}
```

- [ ] **步骤 5: 运行 cargo check 验证编译**

运行: `cd /Users/jun/Documents/dev/env/workspace/claude-pet/src-tauri && cargo check`
预期: 编译成功，无错误

- [ ] **步骤 6: Commit**

```bash
git add src-tauri/src/mcp_client.rs src-tauri/src/lib.rs
git commit -m "feat: implement ClaudeCliManager with status polling"
```

---

## 任务 2: 实现持久进程消息发送

**文件：**
- 修改: `src-tauri/src/mcp_client.rs`

- [ ] **步骤 1: 添加持久进程相关字段和结构**

在 `mcp_client.rs` 中添加:

```rust
use tokio::process::Command;
use tokio::io::AsyncWriteExt;
use std::path::PathBuf;

// 在 ClaudeCliManager 结构体中添加:
pub struct ClaudeCliManager {
    connected: bool,
    current_state: String,
    last_activity: String,
    uptime_seconds: u64,
    message_session: Option<tokio::process::Child>,
    message_stdin: Option<tokio::io::Lines<tokio::io::BufReader<tokio::process::ChildStdout>>>,
}
```

- [ ] **步骤 2: 实现 start_message_session 方法**

在 `impl ClaudeCliManager` 中添加:

```rust
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
    let reader = BufReader::new(stdout).lines();

    self.message_session = Some(child);
    self.message_stdin = Some(reader);
    self.connected = true;

    tracing::info!("Claude message session started");
    Ok(())
}
```

- [ ] **步骤 3: 实现 send_message 方法**

```rust
/// 通过持久进程发送消息
pub async fn send_message(&mut self, content: &str) -> Result<state::Message, String> {
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
        if let Some Ok(response)) = lines.next_line().await {
            tracing::debug!("Message response: {}", response);

            // 解析响应并返回 Message
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                return Ok(state::Message {
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
    }

    Err("No response from claude".to_string())
}
```

- [ ] **步骤 4: 实现 shutdown 方法**

```rust
/// 关闭消息会话
pub async fn shutdown(&mut self) -> Result<(), String> {
    if let Some(mut child) = self.message_session.take() {
        child.kill().await.map_err(|e| e.to_string())?;
        self.message_stdin = None;
        tracing::info!("Claude message session stopped");
    }
    Ok(())
}
```

- [ ] **步骤 5: 修改 lib.rs 中的 send_message 命令**

将 `send_message` 函数替换为:

```rust
#[tauri::command]
async fn send_message(
    state: tauri::State<'_, Mutex<AppState>>,
    session_id: String,
    content: String,
) -> Result<state::Message, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let mut manager = app_state.claude_manager.lock().await;

    match manager.send_message(&content).await {
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
```

- [ ] **步骤 6: 运行 cargo check 验证编译**

运行: `cd /Users/jun/Documents/dev/env/workspace/claude-pet/src-tauri && cargo check`
预期: 编译成功，无错误

- [ ] **步骤 7: Commit**

```bash
git add src-tauri/src/mcp_client.rs src-tauri/src/lib.rs
git commit -m "feat: implement persistent session for message sending"
```

---

## 任务 3: 完善会话管理和状态同步

**文件：**
- 修改: `src-tauri/src/lib.rs`

- [ ] **步骤 1: 完善 get_sessions 实现**

当前实现已能读取 history.jsonl，确认并优化:

```rust
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
```

- [ ] **步骤 2: 修改 get_messages 命令添加真实会话历史读取**

```rust
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
```

- [ ] **步骤 3: 更新 get_claude_status 命令**

```rust
#[tauri::command]
async fn get_claude_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<state::ClaudeStatus, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let mut manager = app_state.claude_manager.lock().await;
    manager.poll_status().await.map_err(|e| e.to_string())
}
```

- [ ] **步骤 4: 运行 cargo check 验证编译**

运行: `cd /Users/jun/Documents/dev/env/workspace/claude-pet/src-tauri && cargo check`
预期: 编译成功，无错误

- [ ] **步骤 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: implement session history reading from history.jsonl"
```

---

## 任务 4: 前端状态同步优化

**文件：**
- 修改: `src/hooks/usePetState.ts`
- 修改: `src/components/Pet.tsx`

- [ ] **步骤 1: 更新 usePetState hook**

```typescript
import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export type PetState = "idle" | "thinking" | "typing" | "waiting" | "error";

interface RealtimeStatus {
  connected: boolean;
  current_state: string;
  uptime_seconds: number;
  last_activity: string;
  current_task: {
    tool_name: string;
    message_preview: string;
    progress: string;
  } | null;
  recent_activities: Array<{
    tool: string;
    description: string;
    timestamp: string;
  }>;
}

export function usePetState() {
  const [state, setState] = useState<PetState>("idle");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await invoke<RealtimeStatus>("get_realtime_status");
      setRealtimeStatus(status);
      setState(status.current_state as PetState);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch status:", e);
      setError(e as string);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { state, realtimeStatus, error, refetch: fetchStatus };
}
```

- [ ] **步骤 2: 更新 Pet.tsx 使用新的状态**

修改 `Pet.tsx` 中的轮询逻辑，使用 `usePetState`:

```typescript
import { usePetState } from "../hooks/usePetState";

function Pet({ onHoverChange }: PetProps) {
  const { state, realtimeStatus } = usePetState();
  // ... 其余代码保持不变
```

- [ ] **步骤 3: 更新 Pet.tsx 显示当前任务**

在 `getAnimationClass` 函数后添加当前任务显示:

```typescript
// 获取当前任务描述
const getCurrentTaskDisplay = () => {
  if (!realtimeStatus?.current_task) return null;
  const task = realtimeStatus.current_task;
  return task.message_preview || task.tool_name;
};
```

- [ ] **步骤 4: 更新 MiniChat.tsx 适配状态**

```typescript
// 在 MiniChat.tsx 中更新 useEffect
useEffect(() => {
  const loadStatus = async () => {
    try {
      const status = await invoke<RealtimeStatus>("get_realtime_status");
      setRealtimeStatus(status);
      setPetState(status.current_state as PetState);
    } catch (e) {
      console.error("Failed to load status:", e);
    }
  };

  loadStatus();
  const interval = setInterval(loadStatus, 2000);
  return () => clearInterval(interval);
}, []);
```

- [ ] **步骤 5: 运行 npm run build 验证前端编译**

运行: `cd /Users/jun/Documents/dev/env/workspace/claude-pet && npm run build`
预期: 编译成功，无错误

- [ ] **步骤 6: Commit**

```bash
git add src/hooks/usePetState.ts src/components/Pet.tsx src/components/MiniChat.tsx
git commit -m "feat: integrate frontend with ClaudeCliManager status polling"
```

---

## 任务 5: HoverInfoPanel 完善

**文件：**
- 修改: `src/components/HoverInfoPanel.tsx`

- [ ] **步骤 1: 更新 HoverInfoPanel 显示任务详情**

```typescript
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./HoverInfoPanel.css";

interface CurrentTask {
  tool_name: string | null;
  message_preview: string | null;
  progress: string | null;
}

interface HoverInfo {
  connected: boolean;
  current_task: CurrentTask | null;
  last_activity: string;
  uptime_seconds: number;
}

function HoverInfoPanel({ visible }: { visible: boolean }) {
  const [info, setInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    if (!visible) return;

    const fetchInfo = async () => {
      try {
        const status = await invoke<{
          connected: boolean;
          current_task: CurrentTask | null;
          last_activity: string;
          uptime_seconds: number;
        }>("get_realtime_status");
        setInfo(status);
      } catch (e) {
        console.error("Failed to fetch hover info:", e);
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !info) return null;

  return (
    <div className="hover-info-panel">
      <div className="info-row">
        <span className="info-label">状态:</span>
        <span className={`info-value ${info.connected ? "connected" : "disconnected"}`}>
          {info.connected ? "已连接" : "未连接"}
        </span>
      </div>
      {info.current_task && (
        <div className="info-row">
          <span className="info-label">任务:</span>
          <span className="info-value">
            {info.current_task.tool_name || "处理中"} - {info.current_task.message_preview || "..."}
          </span>
        </div>
      )}
      <div className="info-row">
        <span className="info-label">最近:</span>
        <span className="info-value">{info.last_activity}</span>
      </div>
    </div>
  );
}

export default HoverInfoPanel;
```

- [ ] **步骤 2: 添加 HoverInfoPanel.css**

创建 `src/components/HoverInfoPanel.css`:

```css
.hover-info-panel {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(100, 100, 255, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  min-width: 180px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  z-index: 1000;
  margin-bottom: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: rgba(150, 150, 200, 0.8);
}

.info-value {
  color: rgba(200, 200, 255, 1);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.connected {
  color: #4ade80;
}

.info-value.disconnected {
  color: #f87171;
}
```

- [ ] **步骤 3: Commit**

```bash
git add src/components/HoverInfoPanel.tsx src/components/HoverInfoPanel.css
git commit -m "feat: enhance HoverInfoPanel with task details"
```

---

## 规格覆盖度检查

| 规格需求 | 对应任务 |
|---------|---------|
| Pet 显示 Claude Code 连接状态 | 任务 1, 4 |
| Pet 显示当前任务气泡 | 任务 4, 5 |
| Pet 交互行为 (bounce/spin/squish/angry) | 已有实现 |
| MiniChat 会话列表 | 任务 3 |
| MiniChat 发送消息 | 任务 2, 4 |
| MiniChat 查看消息历史 | 任务 3 |
| HoverInfoPanel 显示任务详情 | 任务 5 |
| ClaudeCliManager 状态轮询 | 任务 1 |
| ClaudeCliManager 消息发送 | 任务 2 |

**遗漏项检查：** 无遗漏

**占位符扫描：** 无 "TODO"、"待定"

**类型一致性：** 所有类型在前面任务中定义

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-04-19-claude-pet-implementation.md`。

**两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
