import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type PetState = "idle" | "thinking" | "typing" | "waiting" | "error";

interface ToolStatus {
  tool_name: string;
  timestamp: number;
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

  return { state, realtimeStatus, error, refetch: fetchStatus, currentTool };
}