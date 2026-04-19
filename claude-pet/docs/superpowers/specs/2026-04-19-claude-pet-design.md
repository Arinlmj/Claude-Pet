# Claude Pet 完善设计规格

## 1. 概述

**项目目标：** 将 Claude Pet 打造成一个功能完整的桌面宠物应用，能够实时显示 Claude Code 的运行状态，并通过 MiniChat 窗口与 Claude Code 进行双向交互。

**核心价值：** 作为 Claude Code 的"宠物伙伴"，提供轻量化的状态监控和快捷的消息交互体验。

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Pet App                        │
├─────────────────────────────────────────────────────────┤
│  前端 (React + TypeScript)                              │
│  ┌─────────────┐    ┌─────────────┐                    │
│  │  Pet (120x) │    │ MiniChat    │                    │
│  │  显示状态   │    │ 消息交互    │                    │
│  └─────────────┘    └─────────────┘                    │
├─────────────────────────────────────────────────────────┤
│  后端 (Rust + Tauri)                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ClaudeCliManager                                │    │
│  │  - 状态轮询 (claude --print --output-format json)│   │
│  │  - 消息发送 (持久进程 stdin/stdout)             │    │
│  │  - 会话读取 (history.jsonl)                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Claude Code    │
│  (Host Process) │
└─────────────────┘
```

## 3. 功能规格

### 3.1 Pet 窗口 (120x120)

**显示内容：**
- Claude Code 连接状态指示器 (●/○)
- 当前任务气泡：显示正在执行的任务
- 宠物状态：idle / thinking / typing / waiting / error

**宠物状态与显示：**
| 状态 | 显示 | 触发条件 |
|------|------|----------|
| idle | 😴 | Claude Code 空闲 |
| thinking | 💭 | Claude Code 正在思考 |
| typing | ✏️ | Claude Code 正在输出 |
| waiting | ⏳ | 等待用户输入 |
| error | ❌ | 连接或执行错误 |

**交互行为：**
- 单击：打开 MiniChat 窗口 + bounce 动画
- 双击：spin 动画（宠物旋转）
- 长按（500ms）：squish 动画（宠物压扁）
- 右键：angry 动画（宠物生气）
- 拖拽：可拖动宠物位置

**悬停信息：**
- 鼠标悬停时显示 HoverInfoPanel
- 显示当前任务和最近活动时间

### 3.2 MiniChat 窗口 (380x520)

**布局：**
```
┌─────────────────────────────────┐
│ Header (可拖拽)                 │
│ [🤖] Claude Pet  ● [当前任务]  ×│
├───────────┬─────────────────────┤
│ 会话列表  │  消息区域            │
│           │                     │
│ + New     │  [user message]    │
│ session1  │  [assistant reply] │
│ session2  │  [user message]    │
│ ...       │                     │
├───────────┴─────────────────────┤
│ 输入框                    [发送]│
└─────────────────────────────────┘
```

**功能：**
| 功能 | 实现方式 |
|------|----------|
| 查看会话列表 | 读取 `~/.claude/history.jsonl` |
| 切换会话 | 点击会话项 |
| 查看消息 | 持久进程 + fallback |
| 发送消息 | 写入持久进程 stdin |
| 新建会话 | 本地创建，关联到 Claude Code |

**输入框占位符：**
- idle: "Type a message..."
- waiting: "Waiting for reply..."
- thinking: "Claude is thinking..."

### 3.3 ClaudeCliManager (Rust)

**核心职责：**
1. 启动和管理 Claude Code 持久进程
2. 轮询获取 Claude Code 状态
3. 通过 stdin/stdout 与 Claude Code 通信
4. 读取会话历史

**CLI 调用方案：**

| 操作 | 命令 | 频率 |
|------|------|------|
| 获取状态 | `claude --print --output-format json` | 每 1-2 秒 |
| 发送消息 | 通过持久进程 stdin | 按需 |
| 读取会话 | 读取 `~/.claude/history.jsonl` | 每 5 秒或按需 |

**持久进程设计：**
```rust
struct ClaudeCliManager {
    child: Option<ChildStdin>,
    current_task: Option<CurrentTask>,
    connected: bool,
}

impl ClaudeCliManager {
    // 启动持久进程用于消息发送
    async fn start_message_session(&mut self) -> Result<()>;

    // 轮询获取状态（每次调用 CLI）
    async fn poll_status(&mut self) -> Result<RealtimeStatus>;

    // 发送消息（通过持久进程）
    async fn send_message(&mut self, content: &str) -> Result<Message>;
}
```

## 4. 数据流

### 4.1 状态同步流程

```
前端 (Pet)                    Rust Backend                  Claude Code
    │                              │                             │
    │  ──poll──►  get_current_state()                          │
    │                     │                                    │
    │                     │──claude --print──►                 │
    │                     │                                    │
    │                     │◄──────── JSON 状态 ────────────────│
    │                     │                                    │
    │◄──状态 JSON ───────│                                    │
    │                              │                            │
```

### 4.2 消息发送流程

```
前端 (MiniChat)              Rust Backend                  Claude Code
    │                              │                             │
    │  send_message(content) ────► │                            │
    │                     │                                    │
    │                     │──写入 stdin ──►                    │
    │                     │                                    │
    │                     │◄── stdout 响应 ────────────────────│
    │                     │                                    │
    │◄── Message ────────│                                    │
    │                              │                            │
```

## 5. 状态定义

### 5.1 RealtimeStatus

```rust
struct RealtimeStatus {
    connected: bool,           // 是否连接到 Claude Code
    current_state: String,     // idle | thinking | typing | waiting | error
    uptime_seconds: u64,       // 运行时间
    last_activity: String,     // 最后活动时间
    current_task: Option<CurrentTask>,  // 当前任务
    recent_activities: Vec<Activity>,   // 最近活动
}

struct CurrentTask {
    tool_name: Option<String>,      // 工具名（如 "Read", "Write"）
    message_preview: Option<String>, // 任务描述
    progress: Option<String>,       // 进度
}
```

### 5.2 宠物状态映射

| Claude Code 状态 | Pet 状态 | 图标 |
|-----------------|----------|------|
| idle / available | idle | 😴 |
| busy / thinking | thinking | 💭 |
| responding / typing | typing | ✏️ |
| waiting_for_user | waiting | ⏳ |
| error | error | ❌ |

## 6. 实现计划

### Phase 1: 基础状态轮询
- [ ] 实现 `ClaudeCliManager::poll_status()`
- [ ] 修改 `get_current_state` 命令调用 CLI
- [ ] 更新 Pet.tsx 显示真实状态

### Phase 2: 消息发送
- [ ] 实现持久进程管理
- [ ] 实现 `send_message` 通过 stdin/stdout
- [ ] 更新 MiniChat 发送功能

### Phase 3: 会话管理
- [ ] 完善会话列表读取
- [ ] 实现会话切换
- [ ] 消息历史显示

### Phase 4: 优化与增强
- [ ] HoverInfoPanel 显示任务详情
- [ ] 状态变化的实时事件通知
- [ ] 错误处理和重连机制

## 7. 技术约束

- **Tauri v2** - 桌面框架
- **React + TypeScript** - 前端
- **Rust** - 后端
- **tokio** - 异步运行时
- **rmcp** 或 **直接 CLI 调用** - Claude Code 通信

## 8. 成功标准

1. Pet 窗口能实时显示 Claude Code 的连接状态
2. Pet 窗口能显示 Claude Code 当前正在执行的任务
3. MiniChat 能查看会话列表
4. MiniChat 能发送消息并获得回复
5. 宠物状态与 Claude Code 实际状态同步
