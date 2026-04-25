import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type PetState = "idle" | "thinking" | "typing" | "waiting" | "error";

interface ToolStatus {
  tool_name: string;
  details?: string;
  timestamp: number;
  session_id?: string;
}

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
  const [currentTool, setCurrentTool] = useState<ToolStatus | null>(null);
  const lastToolRef = useRef<ToolStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await invoke<RealtimeStatus>("get_realtime_status");
      setRealtimeStatus(status);
      if (!currentTool) {
        setState(status.current_state as PetState);
      }
      setError(null);
    } catch (e) {
      console.error("Failed to fetch status:", e);
      setError(e as string);
    }
  }, [currentTool]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 发送工具完成通知
  const notifyToolCompleted = useCallback(async (tool: ToolStatus) => {
    try {
      await invoke("notify_tool_completed", {
        sessionId: tool.session_id || null,
        toolName: tool.tool_name,
        details: tool.details || null,
      });
    } catch (e) {
      console.error("Failed to send tool completion notification:", e);
    }
  }, []);

  // 监听工具状态变化事件
  useEffect(() => {
    const unlisten = listen<ToolStatus>("tool-status-changed", (event) => {
      const tool = event.payload;
      // 只有工具名称存在且发生变化时才更新
      if (tool?.tool_name && tool.tool_name !== lastToolRef.current?.tool_name) {
        lastToolRef.current = tool;
        setCurrentTool(tool);
        setState("thinking");
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // 轮询获取当前工具状态
  useEffect(() => {
    const fetchTool = async () => {
      try {
        const tool = await invoke<ToolStatus | null>("get_current_tool");
        if (!tool || !tool.tool_name) {
          // 工具为空，清除状态
          if (lastToolRef.current !== null) {
            // 工具结束了，发送通知
            notifyToolCompleted(lastToolRef.current);
            lastToolRef.current = null;
            setCurrentTool(null);
            setState("idle");
          }
        } else {
          // 工具存在且发生变化
          if (tool.tool_name !== lastToolRef.current?.tool_name) {
            lastToolRef.current = tool;
            setCurrentTool(tool);
            setState("thinking");
          } else {
            // 同一工具，只更新时间
            setCurrentTool(tool);
          }
        }
      } catch (e) {
        // 静默忽略
      }
    };
    fetchTool();
    const interval = setInterval(fetchTool, 300);
    return () => clearInterval(interval);
  }, [notifyToolCompleted]);

  return { state, realtimeStatus, error, refetch: fetchStatus, currentTool };
}
