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