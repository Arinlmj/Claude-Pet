# 工具执行状态动画设计

## 概述

在宠物显示 Claude Code 执行状态的基础上，增加工具名称显示和按工具类型触发动画效果，让用户更直观地了解 Claude 正在执行的操作。

## 设计目标

1. 显示当前执行工具的名称
2. 根据工具类型触发不同的动画效果
3. 动画跟随工具执行时间持续
4. 保持与现有状态系统的兼容性

## 显示结构

```
        [工具气泡]
           ↓
    ┌─────────────┐
    │   ✨ Read   │  ← 工具名称 + 图标
    └─────────────┘
          👻
       [状态气泡]   ← idle/typing/thinking 等
```

## 工具分类与动画

| 类别 | 工具列表 | 动画效果 | 图标 |
|------|----------|----------|------|
| **terminal** | Bash, shell | `shake` 左右抖动 | ⌨️ |
| **file** | Read, Write, Edit, Glob, Grep | `tilt-right` 右歪头 | 📄 |
| **search** | WebSearch, WebFetch, SearchCode, SearchIssues, SearchRepos | `squint` 眯眼 | 🔍 |
| **git** | GitCommit, GitPush, GitPull, GitClone, GitFork | `bounce` 跳跃 | 📦 |
| **mcp** | ReadMcpResource, ListMcpResources, GetMcpResource | `blink` 眨眼 | 🔗 |
| **conversation** | AskUserQuestion, GetPrompt | `tilt-left` 左歪头 | 💬 |
| **default** | 其他工具 | `wiggle` 摇摆 | ⚡ |

## 数据流

```
Claude Code 执行工具
    ↓ PostToolUse hook
/tmp/claude-pet-tool-status.json  ← 写入工具信息
    ↑ 文件监控 (notify crate)
Tauri App (Rust)
    ↓ 状态更新
Frontend (React)
    ↓ 工具名称 + 动画
Pet 显示工具气泡 + 触发动画
```

### PostToolUse Hook 配置

在 `~/.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"tool_name\":\"$TOOL_NAME\",\"timestamp\":'$(date +%s)'}' > /tmp/claude-pet-tool-status.json"
          }
        ]
      }
    ]
  }
}
```

### 监控文件格式

```json
{
  "tool_name": "Bash",
  "timestamp": 1713672000
}
```

## 后端实现

### 1. 文件监控 (Rust)

使用 `notify` crate 监控 `/tmp/claude-pet-tool-status.json` 文件变化：

```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc::channel;
use std::time::Duration;

pub fn watch_tool_status<F>(callback: F) -> Result<(), String>
where
    F: Fn(String) + Send + 'static,
{
    let path = PathBuf::from("/tmp/claude-pet-tool-status.json");
    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, _>| {
            if let Ok(event) = res {
                tx.send(event).unwrap();
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
                        // Read and parse file
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                                callback(json.to_string());
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
```

### 2. 新增 Tauri 命令

```rust
#[tauri::command]
async fn get_current_tool() -> Result<Option<ToolStatus>, String> {
    let path = PathBuf::from("/tmp/claude-pet-tool-status.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}
```

## 前端实现

### 1. 新增 Hook 返回 currentTool

```typescript
interface ToolStatus {
  tool_name: string | null;
  timestamp: number;
}

export function usePetState() {
  const [currentTool, setCurrentTool] = useState<ToolStatus | null>(null);

  // 轮询获取当前工具状态
  useEffect(() => {
    const fetchTool = async () => {
      try {
        const tool = await invoke<ToolStatus | null>("get_current_tool");
        setCurrentTool(tool);
      } catch (e) {
        // ignore
      }
    };
    fetchTool();
    const interval = setInterval(fetchTool, 500);
    return () => clearInterval(interval);
  }, []);

  return { state, currentTool, /* ... */ };
}
```

### 2. 工具分类映射

```typescript
export function getToolCategory(toolName: string): string {
  const terminalTools = ["Bash", "shell"];
  const fileTools = ["Read", "Write", "Edit", "Glob", "Grep"];
  const searchTools = ["WebSearch", "WebFetch", "SearchCode"];
  const gitTools = ["GitCommit", "GitPush", "GitPull", "GitClone"];
  const mcpTools = ["ReadMcpResource", "ListMcpResources"];
  const conversationTools = ["AskUserQuestion", "GetPrompt"];

  if (terminalTools.includes(toolName)) return "terminal";
  if (fileTools.includes(toolName)) return "file";
  if (searchTools.includes(toolName)) return "search";
  if (gitTools.includes(toolName)) return "git";
  if (mcpTools.includes(toolName)) return "mcp";
  if (conversationTools.includes(toolName)) return "conversation";
  return "default";
}
```

### 3. CSS 动画

同上文"工具分类与动画"表格定义。

## 文件变更清单

| 文件 | 变更内容 |
|------|----------|
| `src-tauri/Cargo.toml` | 添加 `notify` crate 依赖 |
| `src-tauri/src/lib.rs` | 新增文件监控和 `get_current_tool` 命令 |
| `src-tauri/src/state.rs` | 添加 `ToolStatus` 结构体 |
| `src/hooks/usePetState.ts` | 返回 `currentTool` |
| `src/components/Pet.tsx` | 集成工具显示和动画 |
| `src/components/Pet.css` | 添加工具动画样式 |
| `src/components/ToolBubble.tsx` | 新建工具气泡组件 |

## 实现顺序

1. **后端**：添加 `notify` crate，监控文件变化
2. **命令**：新增 `get_current_tool` Tauri 命令
3. **Hook**：`usePetState` 返回 `currentTool`
4. **组件**：创建 `ToolBubble` 组件
5. **Pet**：集成工具显示和动画
6. **样式**：添加 CSS 动画
7. **配置**：用户配置 PostToolUse hook
8. **测试**：验证各工具类型动画效果
