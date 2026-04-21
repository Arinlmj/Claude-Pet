# 工具执行状态动画实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 通过 Claude Code PostToolUse hook 监控工具执行，在宠物窗口显示工具名称和动画效果

**架构：** Claude Code 执行工具 → PostToolUse hook 写入 /tmp/claude-pet-tool-status.json → Tauri 监控文件变化 → 前端显示工具气泡 + 动画

**技术栈：** React + TypeScript + Tauri + Rust (notify crate) + CSS Animations

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src-tauri/Cargo.toml` | 添加 `notify` crate 依赖 |
| `src-tauri/src/lib.rs` | 文件监控和 `get_current_tool` 命令 |
| `src-tauri/src/state.rs` | `ToolStatus` 结构体 |
| `src/hooks/usePetState.ts` | 返回 `currentTool` |
| `src/components/ToolBubble.tsx` | 工具气泡组件 |
| `src/components/Pet.tsx` | 集成工具显示和动画 |
| `src/components/Pet.css` | 工具动画 CSS 样式 |

---

## 任务 1：后端 - 添加 notify crate 依赖

**文件：**
- 修改：`src-tauri/Cargo.toml`

- [ ] **步骤 1：添加 notify 依赖**

在 `[dependencies]` 段添加：
```toml
notify = "6"
```

- [ ] **步骤 2：验证编译**

运行：`cd src-tauri && cargo check`
预期：编译成功，无错误

- [ ] **步骤 3：Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add notify crate for file monitoring"
```

---

## 任务 2：后端 - 添加 ToolStatus 结构体

**文件：**
- 修改：`src-tauri/src/state.rs`

- [ ] **步骤 1：添加 ToolStatus 结构体**

在文件末尾添加：
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub tool_name: String,
    pub timestamp: u64,
}
```

- [ ] **步骤 2：验证编译**

运行：`cd src-tauri && cargo check`
预期：编译成功，无错误

- [ ] **步骤 3：Commit**

```bash
git add src-tauri/src/state.rs
git commit -m "feat: add ToolStatus struct for tool monitoring"
```

---

## 任务 3：后端 - 添加文件监控和 get_current_tool 命令

**文件：**
- 修改：`src-tauri/src/lib.rs`

- [ ] **步骤 1：添加导入**

在文件顶部添加：
```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc::channel;
use std::time::Duration;
```

- [ ] **步骤 2：添加文件监控逻辑**

在 `lib.rs` 中添加辅助函数：

```rust
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
```

- [ ] **步骤 3：在 setup 函数中调用监控**

在 `setup` 函数中（`app.manage` 之后）添加：
```rust
if let Err(e) = setup_tool_status_watcher(app.handle()) {
    tracing::warn!("Failed to setup tool status watcher: {}", e);
}
```

- [ ] **步骤 4：添加 get_current_tool 命令**

在 `lib.rs` 中添加：

```rust
#[tauri::command]
async fn get_current_tool() -> Result<Option<state::ToolStatus>, String> {
    let path = std::path::PathBuf::from("/tmp/claude-pet-tool-status.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    let tool_status: state::ToolStatus = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;
    if tool_status.tool_name.is_empty() {
        Ok(None)
    } else {
        Ok(Some(tool_status))
    }
}
```

- [ ] **步骤 5：在 tauri::generate_inline_modules! 之前注册命令**

找到 `get_current_tool` 的注册位置（在其他命令定义之后、`generate_inline_modules!` 之前添加）

- [ ] **步骤 6：验证编译**

运行：`cd src-tauri && cargo check`
预期：编译成功，无错误

- [ ] **步骤 7：Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add file monitoring and get_current_tool command"
```

---

## 任务 4：前端 - usePetState Hook 增强

**文件：**
- 修改：`src/hooks/usePetState.ts`

- [ ] **步骤 1：添加 ToolStatus 接口**

```typescript
interface ToolStatus {
  tool_name: string;
  timestamp: number;
}
```

- [ ] **步骤 2：添加 currentTool 状态**

```typescript
const [currentTool, setCurrentTool] = useState<ToolStatus | null>(null);
```

- [ ] **步骤 3：添加轮询和事件监听**

```typescript
// 监听工具状态变化事件
useEffect(() => {
  const unlisten = listen<ToolStatus>("tool-status-changed", (event) => {
    setCurrentTool(event.payload);
  });
  return () => { unlisten.then((fn) => fn()); };
}, []);

// 轮询获取当前工具状态（作为后备）
useEffect(() => {
  const fetchTool = async () => {
    try {
      const tool = await invoke<ToolStatus | null>("get_current_tool");
      if (tool) setCurrentTool(tool);
    } catch (e) {
      // ignore
    }
  };
  fetchTool();
  const interval = setInterval(fetchTool, 500);
  return () => clearInterval(interval);
}, []);
```

- [ ] **步骤 4：更新返回值**

```typescript
return { state, realtimeStatus, error, refetch: fetchStatus, currentTool };
```

- [ ] **步骤 5：验证编译**

运行：`npx tsc --noEmit`
预期：编译成功，无错误

- [ ] **步骤 6：Commit**

```bash
git add src/hooks/usePetState.ts
git commit -m "feat: usePetState returns currentTool"
```

---

## 任务 5：创建 ToolBubble 组件

**文件：**
- 创建：`src/components/ToolBubble.tsx`
- 创建：`src/components/ToolBubble.css`

- [ ] **步骤 1：创建 ToolBubble.tsx**

```tsx
import "./ToolBubble.css";

interface ToolBubbleProps {
  toolName: string | null;
  visible: boolean;
}

const TOOL_ICON_MAP: Record<string, string> = {
  Bash: "⌨️",
  Read: "📄",
  Write: "📄",
  Edit: "📄",
  Glob: "📄",
  Grep: "📄",
  WebSearch: "🔍",
  WebFetch: "🔍",
  SearchCode: "🔍",
  GitCommit: "📦",
  GitPush: "📦",
  GitPull: "📦",
  ReadMcpResource: "🔗",
  ListMcpResources: "🔗",
  AskUserQuestion: "💬",
};

export function getToolIcon(toolName: string): string {
  return TOOL_ICON_MAP[toolName] || "⚡";
}

export function getToolCategory(toolName: string): string {
  const terminalTools = ["Bash", "shell"];
  const fileTools = ["Read", "Write", "Edit", "Glob", "Grep"];
  const searchTools = ["WebSearch", "WebFetch", "SearchCode", "SearchIssues", "SearchRepos"];
  const gitTools = ["GitCommit", "GitPush", "GitPull", "GitClone", "GitFork"];
  const mcpTools = ["ReadMcpResource", "ListMcpResources", "GetMcpResource"];
  const conversationTools = ["AskUserQuestion", "GetPrompt"];

  if (terminalTools.includes(toolName)) return "terminal";
  if (fileTools.includes(toolName)) return "file";
  if (searchTools.includes(toolName)) return "search";
  if (gitTools.includes(toolName)) return "git";
  if (mcpTools.includes(toolName)) return "mcp";
  if (conversationTools.includes(toolName)) return "conversation";
  return "default";
}

function ToolBubble({ toolName, visible }: ToolBubbleProps) {
  if (!visible || !toolName) return null;

  const icon = getToolIcon(toolName);

  return (
    <div className="tool-bubble">
      <span className="tool-icon">{icon}</span>
      <span className="tool-name">{toolName}</span>
    </div>
  );
}

export default ToolBubble;
```

- [ ] **步骤 2：创建 ToolBubble.css**

```css
.tool-bubble {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  z-index: 100;
}

.tool-bubble::after {
  content: "";
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.95);
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **步骤 3：验证编译**

运行：`npx tsc --noEmit`
预期：编译成功，无错误

- [ ] **步骤 4：Commit**

```bash
git add src/components/ToolBubble.tsx src/components/ToolBubble.css
git commit -m "feat: add ToolBubble component"
```

---

## 任务 6：Pet 组件集成

**文件：**
- 修改：`src/components/Pet.tsx`

- [ ] **步骤 1：导入 ToolBubble**

```typescript
import ToolBubble from "./ToolBubble";
```

- [ ] **步骤 2：获取 currentTool**

```typescript
const { state, currentTool } = usePetState();
```

- [ ] **步骤 3：添加 toolAnimation 状态**

```typescript
const [toolAnimation, setToolAnimation] = useState<string>("");
```

- [ ] **步骤 4：添加 useEffect 监听 currentTool 变化**

```typescript
useEffect(() => {
  if (currentTool?.tool_name) {
    const category = getToolCategory(currentTool.tool_name);
    setToolAnimation(category);
  } else {
    setToolAnimation("");
  }
}, [currentTool]);
```

- [ ] **步骤 5：在 JSX 中添加 ToolBubble**

在 `pet-ghost` 上方添加：
```tsx
<ToolBubble toolName={currentTool?.tool_name} visible={!!currentTool?.tool_name} />
```

- [ ] **步骤 6：修改 pet-ghost 应用工具动画**

```tsx
className={`pet-ghost ${state} ${toolAnimation}`}
```

- [ ] **步骤 7：验证编译**

运行：`npx tsc --noEmit`
预期：编译成功，无错误

- [ ] **步骤 8：Commit**

```bash
git add src/components/Pet.tsx
git commit -m "feat: integrate ToolBubble and tool animations into Pet"
```

---

## 任务 7：CSS 动画样式

**文件：**
- 修改：`src/components/Pet.css`

- [ ] **步骤 1：添加工具动画类**

在 `Pet.css` 末尾添加：

```css
/* 工具执行动画 */

/* 抖动 - terminal 类 (Bash, shell) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.pet-ghost.terminal {
  animation: shake 0.3s ease-in-out infinite;
}

/* 右歪头 - file 类 (Read, Write, Edit, Glob, Grep) */
@keyframes tilt-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(15deg); }
}

.pet-ghost.file {
  animation: tilt-right 0.8s ease-in-out infinite;
}

/* 眯眼 - search 类 (WebSearch, WebFetch, SearchCode 等) */
@keyframes squint {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.85); }
}

.pet-ghost.search .eye {
  animation: squint 1.5s ease-in-out infinite;
}

/* 跳跃 - git 类 (GitCommit, GitPush, GitPull 等) */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.pet-ghost.git {
  animation: bounce 0.5s ease-in-out infinite;
}

/* 眨眼 - mcp 类 (ReadMcpResource, ListMcpResources 等) */
@keyframes blink {
  0%, 45%, 55%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.1); }
}

.pet-ghost.mcp {
  animation: blink 2s ease-in-out infinite;
}

/* 左歪头 - conversation 类 (AskUserQuestion, GetPrompt) */
@keyframes tilt-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-15deg); }
}

.pet-ghost.conversation {
  animation: tilt-left 1s ease-in-out infinite;
}

/* 摇摆 - default 类 (其他工具) */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}

.pet-ghost.default,
.pet-ghost:not([class*="terminal"]):not([class*="file"]):not([class*="search"]):not([class*="git"]):not([class*="mcp"]):not([class*="conversation"]) {
  animation: wiggle 0.6s ease-in-out infinite;
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/Pet.css
git commit -m "feat: add tool execution animations to Pet"
```

---

## 任务 8：用户配置 PostToolUse Hook

**用户需要在 `~/.claude/settings.json` 中配置：**

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

此步骤由用户手动配置，不在代码中实现。

---

## 任务 9：验证与测试

**文件：**
- 测试：运行 Tauri 开发服务器

- [ ] **步骤 1：启动 Tauri 开发服务器**

运行：`npm run tauri dev`
预期：应用启动，无崩溃

- [ ] **步骤 2：在 Claude Code 中触发工具，验证动画**

执行不同类型命令：
1. `ls -la` → 验证 terminal 抖动动画
2. `Read` 某文件 → 验证 file 歪头动画
3. `WebSearch` → 验证 search 眯眼动画

- [ ] **步骤 3：Commit 最终变更**

```bash
git add -A
git commit -m "feat: complete tool execution status animations"
```

---

## 自检清单

- [ ] 规格覆盖：所有工具类别都有对应动画
- [ ] 占位符扫描：无 "TODO"、"待定" 等占位符
- [ ] 类型一致性：ToolStatus.tool_name 与 getToolCategory 输入一致
- [ ] 编译通过：tsc --noEmit 和 cargo check 都成功
- [ ] 动画触发：工具执行时动画正确显示
