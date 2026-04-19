import { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./MiniChat.css";

interface Session {
  id: string;
  title: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
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
  recent_activities: {
    tool: string;
    description: string;
    timestamp: string;
  }[];
}

type PetState = "idle" | "thinking" | "typing" | "waiting" | "error";

function MiniChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [petState, setPetState] = useState<PetState>("idle");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessionList = await invoke<Session[]>("get_sessions");
        setSessions(sessionList);
        if (sessionList.length > 0) {
          setCurrentSessionId(sessionList[0].id);
        }
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    };
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId) return;

    const loadMessages = async () => {
      try {
        const messageList = await invoke<Message[]>("get_messages", {
          sessionId: currentSessionId,
        });
        setMessages(messageList);
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    };
    loadMessages();
  }, [currentSessionId]);

  // Poll for state changes
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await invoke<RealtimeStatus>("get_realtime_status");
        setRealtimeStatus(status);
        setPetState(status.current_state as PetState);
      } catch (e) {
        console.error("Failed to load status:", e);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for new messages
  useEffect(() => {
    const unlisten = listen<Message>("new-message", (event) => {
      setMessages((prev) => [...prev, event.payload]);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !currentSessionId) return;

    try {
      const newMessage = await invoke<Message>("send_message", {
        sessionId: currentSessionId,
        content: inputValue,
      });
      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  }, [inputValue, currentSessionId]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle close
  const handleClose = useCallback(async () => {
    const win = getCurrentWindow();
    await win.close();
  }, []);

  // Handle drag
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).closest(".chat-header")) {
      const win = getCurrentWindow();
      await win.startDragging();
    }
  }, []);

  // New session
  const handleNewSession = useCallback(() => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: "New conversation",
      updated_at: "Just now",
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  }, []);

  return (
    <div className="mini-chat" onMouseDown={handleMouseDown}>
      {/* Header */}
      <div className="chat-header" data-tauri-drag-region>
        <div className="header-left">
          <span className="header-icon">🤖</span>
          <span className="header-title">Claude Pet</span>
          <span className={`state-badge ${realtimeStatus?.connected ? 'connected' : 'disconnected'}`}>
            {realtimeStatus?.connected ? '●' : '○'}
          </span>
        </div>
        <div className="header-info">
          {realtimeStatus?.current_task && (
            <div className="current-task">
              <span className="task-tool">{realtimeStatus.current_task.tool_name}</span>
              <span className="task-msg">{realtimeStatus.current_task.message_preview}</span>
            </div>
          )}
        </div>
        <button className="close-btn" onClick={handleClose}>
          ×
        </button>
      </div>

      {/* Body */}
      <div className="chat-body">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <button className="new-session-btn" onClick={handleNewSession}>
            + New Chat
          </button>
          <div className="session-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${
                  session.id === currentSessionId ? "active" : ""
                }`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="session-title">{session.title}</div>
                <div className="session-time">{session.updated_at}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          <div className="messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.role === "user" ? "user" : "assistant"}`}
              >
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{msg.timestamp}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <textarea
              className="chat-input"
              placeholder={
                petState === "waiting"
                  ? "Waiting for reply..."
                  : petState === "thinking"
                  ? "Claude is thinking..."
                  : "Type a message..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={petState === "waiting" || petState === "thinking"}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={petState === "waiting" || petState === "thinking"}
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MiniChat;
