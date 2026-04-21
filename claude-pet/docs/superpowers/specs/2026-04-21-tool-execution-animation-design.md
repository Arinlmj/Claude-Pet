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
Rust: poll_status()
  → 返回 ClaudeStatus {
      current_state: "thinking",
      current_task: {
        tool_name: "Bash",
        message_preview: "ls -la",
        progress: "50%"
      }
    }
  → Frontend: usePetState 解析 current_task
  → 根据 tool_name 匹配类别 → 获取动画类型
  → 显示工具气泡 + 触发对应动画
  → 动画持续到下一次 poll 状态变化
```

## 前端变更

### 1. usePetState Hook 增强

```typescript
interface CurrentTask {
  tool_name: string | null;
  message_preview: string | null;
  progress: string | null;
}

// 新增返回 currentTask
return { state, realtimeStatus, error, refetch, currentTask };
```

### 2. 工具分类映射

```typescript
const TOOL_CATEGORY_MAP: Record<string, { category: string; icon: string }> = {
  Bash: { category: 'terminal', icon: '⌨️' },
  Read: { category: 'file', icon: '📄' },
  Write: { category: 'file', icon: '📄' },
  Edit: { category: 'file', icon: '📄' },
  Glob: { category: 'file', icon: '📄' },
  Grep: { category: 'file', icon: '📄' },
  WebSearch: { category: 'search', icon: '🔍' },
  // ... 其他工具
};
```

### 3. Pet 组件变更

- 新增 `ToolBubble` 组件显示工具名称
- 新增 `toolAnimation` 状态
- 根据工具类型应用不同 CSS 动画类

### 4. CSS 动画定义

```css
/* 抖动 - terminal 类 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* 右歪头 - file 类 */
@keyframes tilt-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(15deg); }
}

/* 眯眼 - search 类 */
@keyframes squint {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.3); }
}

/* 跳跃 - git 类 */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* 眨眼 - mcp 类 */
@keyframes blink {
  0%, 45%, 55%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.1); }
}

/* 歪头 - conversation 类 */
@keyframes tilt-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-15deg); }
}

/* 摇摆 - default 类 */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}
```

## Rust 后端变更

### 1. poll_status 增强

`current_task` 字段需要包含完整信息：

```rust
pub struct CurrentTask {
    pub tool_name: Option<String>,
    pub message_preview: Option<String>,
    pub progress: Option<String>,
}
```

目前 `poll_status` 返回的 `ClaudeStatus.current_task` 为 `None`，需要从 `claude --print` 输出中解析 `current_task` 信息。

### 2. 解析 claude --print 输出

Claude `--print -p status` 返回的 JSON 可能包含：
- `state`: 当前状态
- `task`: 当前任务信息（含 `tool` 字段）

需要检查实际返回格式并调整解析逻辑。

## 文件变更清单

| 文件 | 变更内容 |
|------|----------|
| `src/hooks/usePetState.ts` | 返回 currentTask |
| `src/components/Pet.tsx` | 新增工具气泡、动画逻辑 |
| `src/components/Pet.css` | 新增工具动画样式 |
| `src/components/ToolBubble.tsx` | 新建工具气泡组件 |
| `src-tauri/src/mcp_client.rs` | 解析 current_task 信息 |
| `src-tauri/src/state.rs` | CurrentTask 结构体已存在 |

## 实现顺序

1. **后端**：完善 `poll_status` 解析，验证 `current_task` 数据
2. **Hook**：`usePetState` 返回 `currentTask`
3. **组件**：创建 `ToolBubble` 组件
4. **Pet** ：集成工具显示和动画
5. **样式**：添加 CSS 动画
6. **测试**：各工具类型动画效果验证
