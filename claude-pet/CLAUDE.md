# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Claude Pet 是一个 Tauri v2 桌面应用，在屏幕上显示一个浮动的"宠物"形象，通过 MCP (Model Context Protocol) 与 Claude Code 通信。

## 常用命令

```bash
npm run dev          # 启动前端开发服务器 (Vite, port 1420)
npm run build        # 构建前端 (tsc + vite build)
cargo run            # 运行 Tauri 应用 (开发模式)
cargo build          # 构建 Tauri 应用 (生产)
```

## 架构

### 双窗口系统

应用使用两个窗口，窗口标签决定渲染内容：
- **pet** (默认): 320x180 透明浮动窗口，显示宠物形象
- **mini-chat**: 380x520 聊天窗口

窗口在 `src-tauri/src/lib.rs` 的 `setup` 和 `open_mini_chat` 命令中动态创建。

### 前端 (React + TypeScript)

- `src/App.tsx` - 读取 `window.label` 判断渲染 Pet 还是 MiniChat
- `src/components/Pet.tsx` - 浮动宠物组件主入口，含点击动画、拖拽、右键菜单
- `src/components/pets/EmojiPet.tsx` - Emoji 宠物渲染器（当前使用 Apple Emoji）
- `src/components/pets/ContextMenu.tsx` - 右键设置菜单（宠物切换/会话记录）
- `src/components/ToolBubble.tsx` - 工具执行气泡提示
- `src/hooks/usePetState.ts` - 宠物状态管理 hook

### 后端 (Rust)

- `src-tauri/src/lib.rs` - Tauri 设置、窗口创建、Tauri commands
- `src-tauri/src/state.rs` - AppState 和共享数据类型
- `src-tauri/src/mcp_client.rs` - MCP client stub (使用 `rmcp` crate)

### Tauri 命令

与前端通信的主要命令：
- `open_mini_chat(x, y)` / `close_mini_chat()` - 窗口管理
- `get_sessions()` / `get_messages(session_id)` / `send_message(session_id, content)` - 会话操作
- `get_current_state()` / `set_pet_state(new_state)` - 宠物状态
- `get_claude_status()` / `get_project_info()` - Claude 状态
- `get_realtime_status()` - 实时状态（通过文件轮询）
- `get_current_tool()` / `notify_tool_completed()` - 工具状态

### 状态同步

前端通过 `invoke<T>(command, args)` 调用 Rust 命令，通过 `listen<T>(event, callback)` 监听事件。

宠物状态通过 `usePetState` hook 同步：
- `get_realtime_status()` 每 2 秒轮询
- `get_current_tool()` 每 300ms 轮询
- `tool-status-changed` 事件监听工具变化

### 宠物状态与交互

状态：`idle | thinking | typing | waiting | error`

交互：
- 单击 bounce
- 双击 spin
- 长按(500ms) squish
- 右键 angry

宠物类型存储在 localStorage (`claude-pet-type`)，支持 8 种 Emoji 宠物。

## 配置

- `src-tauri/tauri.conf.json` - Tauri 应用配置
- `src-tauri/Cargo.toml` - Rust 依赖 (tauri v2, rmcp, tokio, tracing, notify)
- `vite.config.ts` - Vite 配置
- `tsconfig.json` - TypeScript 严格模式

## 开发注意事项

- MCP client (`mcp_client.rs`) 目前是 stub 实现，大部分命令返回模拟数据
- 窗口使用 `transparent: true`，需要确保 CSS 没有不透明背景
- 宠物右键菜单使用 `position: absolute` 相对于 pet-container
- `notify` crate 用于监控 `/tmp/claude-pet-tool-status.json` 文件变化
