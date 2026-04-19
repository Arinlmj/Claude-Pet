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
