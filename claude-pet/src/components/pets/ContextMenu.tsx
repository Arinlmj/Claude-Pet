import "./ContextMenu.css";

interface PetOption {
  type: string;
  name: string;
  emoji: string;
  secondaryEmoji?: string;
}

interface SessionOption {
  id: string;
  title: string;
  updated_at: string;
}

interface ContextMenuProps {
  show: boolean;
  activeTab: "pets" | "sessions";
  onTabChange: (tab: "pets" | "sessions") => void;
  pets: PetOption[];
  currentPetType: string;
  onSelectPet: (type: string) => void;
  sessions: SessionOption[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onClose: () => void;
}

export function ContextMenu({
  show,
  activeTab,
  onTabChange,
  pets,
  currentPetType,
  onSelectPet,
  sessions,
  activeSessionId,
  onSelectSession,
  onClose,
}: ContextMenuProps) {
  if (!show) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  return (
    <div className="context-menu-overlay" onClick={onClose}>
      <div className="context-menu" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="context-header">
          <div className="context-title">设置</div>
          <button className="context-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="context-tabs">
          <button
            className={`context-tab ${activeTab === "pets" ? "active" : ""}`}
            onClick={() => onTabChange("pets")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>
            切换宠物
          </button>
          <button
            className={`context-tab ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => onTabChange("sessions")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            会话记录
          </button>
        </div>

        {/* Content */}
        <div className="context-content">
          {activeTab === "pets" && (
            <div className="pets-grid">
              {pets.map((pet) => (
                <button
                  key={pet.type}
                  className={`pet-card ${pet.type === currentPetType ? "active" : ""}`}
                  onClick={() => onSelectPet(pet.type)}
                >
                  <div className="pet-card-emoji">{pet.emoji}</div>
                  <div className="pet-card-name">{pet.name}</div>
                  {pet.secondaryEmoji && (
                    <div className="pet-card-accessory">{pet.secondaryEmoji}</div>
                  )}
                  {pet.type === currentPetType && (
                    <div className="pet-card-check">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="sessions-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>暂无会话记录</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`session-card ${session.id === activeSessionId ? "active" : ""}`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="session-card-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="session-card-content">
                      <div className="session-card-title">{session.title}</div>
                      <div className="session-card-time">{formatTime(session.updated_at)}</div>
                    </div>
                    {session.id === activeSessionId && (
                      <div className="session-card-check">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
