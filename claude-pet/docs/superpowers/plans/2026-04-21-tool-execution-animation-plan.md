# 工具执行状态动画实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在宠物窗口显示当前执行工具的名称和动画效果

**架构：** 前端通过轮询获取 Claude 状态，解析 current_task 信息，根据工具类型映射到对应动画类别，渲染工具气泡并触发动画

**技术栈：** React + TypeScript + Tauri + Rust + CSS Animations

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src-tauri/src/mcp_client.rs` | 解析 claude --print JSON，提取 current_task |
| `src/hooks/usePetState.ts` | 返回 currentTask 供组件使用 |
| `src/components/ToolBubble.tsx` | 工具气泡组件，显示工具名称和图标 |
| `src/components/Pet.tsx` | 集成工具显示和动画触发逻辑 |
| `src/components/Pet.css` | 工具动画 CSS 样式 |

---

## 任务 1：后端解析 current_task

**文件：**
- 修改：`src-tauri/src/mcp_client.rs:62-118`

- [ ] **步骤 1：分析 claude --print 输出格式**

运行：`claude --print --output-format json -p status`
检查返回的 JSON 结构，确认 current_task 字段位置

- [ ] **步骤 2：修改 poll_status 解析逻辑**

在 `src-tauri/src/mcp_client.rs` 的 `poll_status` 方法中：

```rust
// 解析 current_task
let current_task = json.get("task")
    .or_else(|| json.get("current_task"))
    .and_then(|v| v.as_object())
    .map(|obj| CurrentTask {
        tool_name: obj.get("tool")
            .and_then(|v| v.as_str())
            .map(String::from),
        message_preview: obj.get("message")
            .or_else(|| obj.get("content"))
            .and_then(|v| v.as_str())
            .map(String::from),
        progress: obj.get("progress")
            .and_then(|v| v.as_str())
            .map(String::from),
    });

Ok(ClaudeStatus {
    connected: true,
    current_state: state,
    uptime_seconds: self.uptime_seconds,
    last_activity: self.last_activity.clone(),
    current_task,
    recent_activities: vec![],
})
```

- [ ] **步骤 3：验证编译**

运行：`cd src-tauri && cargo check`
预期：编译成功，无错误

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/src/mcp_client.rs
git commit -m "feat: parse current_task from claude --print output"
```

---

## 任务 2：usePetState Hook 增强

**文件：**
- 修改：`src/hooks/usePetState.ts:23-46`

- [ ] **步骤 1：添加 CurrentTask 类型**

```typescript
interface CurrentTask {
  tool_name: string | null;
  message_preview: string | null;
  progress: string | null;
}
```

- [ ] **步骤 2：返回 currentTask**

```typescript
export function usePetState() {
  const [state, setState] = useState<PetState>("idle");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus | null>(null);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await invoke<RealtimeStatus>("get_realtime_status");
      setRealtimeStatus(status);
      setState(status.current_state as PetState);
      setCurrentTask(status.current_task);
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

  return { state, realtimeStatus, error, refetch: fetchStatus, currentTask };
}
```

- [ ] **步骤 3：验证编译**

运行：`npx tsc --noEmit`
预期：编译成功，无错误

- [ ] **步骤 4：Commit**

```bash
git add src/hooks/usePetState.ts
git commit -m "feat: usePetState returns currentTask"
```

---

## 任务 3：创建 ToolBubble 组件

**文件：**
- 创建：`src/components/ToolBubble.tsx`

- [ ] **步骤 1：创建组件**

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
  SearchIssues: "🔍",
  SearchRepos: "🔍",
  GitCommit: "📦",
  GitPush: "📦",
  GitPull: "📦",
  GitClone: "📦",
  GitFork: "📦",
  ReadMcpResource: "🔗",
  ListMcpResources: "🔗",
  GetMcpResource: "🔗",
  AskUserQuestion: "💬",
  GetPrompt: "💬",
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

- [ ] **步骤 2：创建样式文件**

创建 `src/components/ToolBubble.css`:

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

## 任务 4：Pet 组件集成

**文件：**
- 修改：`src/components/Pet.tsx`

- [ ] **步骤 1：导入 ToolBubble**

在文件顶部添加：
```typescript
import ToolBubble from "./ToolBubble";
```

- [ ] **步骤 2：获取 currentTask**

修改 `usePetState` 解构：
```typescript
const { state, currentTask } = usePetState();
```

- [ ] **步骤 3：添加 toolAnimation 状态**

```typescript
const [toolAnimation, setToolAnimation] = useState<string>("");
```

- [ ] **步骤 4：添加 useEffect 监听 currentTask 变化**

```typescript
useEffect(() => {
  if (currentTask?.tool_name) {
    const category = getToolCategory(currentTask.tool_name);
    setToolAnimation(category);
  } else {
    setToolAnimation("");
  }
}, [currentTask]);
```

- [ ] **步骤 5：在 JSX 中添加 ToolBubble**

在 pet-container 内、pet-ghost 上方添加：
```tsx
<ToolBubble toolName={currentTask?.tool_name} visible={!!currentTask?.tool_name} />
```

- [ ] **步骤 6：修改 pet-ghost 应用工具动画**

将 `className={`pet-ghost ${state}`}` 改为：
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

## 任务 5：CSS 动画样式

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

- [ ] **步骤 2：验证文件**

运行：`cat src/components/Pet.css | tail -80`
预期：看到新添加的动画样式

- [ ] **步骤 3：Commit**

```bash
git add src/components/Pet.css
git commit -m "feat: add tool execution animations to Pet"
```

---

## 任务 6：验证与测试

**文件：**
- 测试：运行 Tauri 开发服务器

- [ ] **步骤 1：启动 Tauri 开发服务器**

运行：`npm run tauri dev`
预期：应用启动，无崩溃

- [ ] **步骤 2：触发不同工具测试动画**

在 Claude Code 中执行不同类型命令：
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
- [ ] 类型一致性：CurrentTask.tool_name 与 getToolCategory 输入一致
- [ ] 编译通过：tsc --noEmit 和 cargo check 都成功
- [ ] 动画触发：工具执行时动画正确显示
