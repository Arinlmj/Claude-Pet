import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ToolBubble, { getToolCategory } from "./ToolBubble";
import { usePetState } from "../hooks/usePetState";
import { EmojiPetRenderer, getStateEmoji, PET_PRESETS, PetType } from "./pets/EmojiPet";
import { ContextMenu } from "./pets/ContextMenu";
import "./Pet.css";

type InteractionType = "bounce" | "spin" | "squish" | "angry" | null;

interface Session {
  id: string;
  title: string;
  updated_at: string;
}

interface PetProps {}

const PET_TYPE_KEY = "claude-pet-type";

function Pet(_props: PetProps) {
  const { state, currentTool } = usePetState();
  const [isBlinking, setIsBlinking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interaction, setInteraction] = useState<InteractionType>(null);
  const [showStars, setShowStars] = useState(false);
  const [toolAnimation, setToolAnimation] = useState<string>("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuTab, setMenuTab] = useState<"pets" | "sessions">("pets");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [petType, setPetType] = useState<PetType>("bunny");
  const menuRef = useRef<HTMLDivElement>(null);
  const currentPosRef = useRef({ x: 1100, y: 650 });
  const targetRef = useRef({ x: 1100, y: 650 });
  const isDraggingRef = useRef(false);

  // Click detection refs
  const lastClickTimeRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Load pet type from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PET_TYPE_KEY);
    if (saved && PET_PRESETS.some(p => p.type === saved)) {
      setPetType(saved as PetType);
    }
  }, []);

  // Initialize position on mount - bottom right
  useEffect(() => {
    const init = async () => {
      try {
        currentPosRef.current = { x: 700, y: 500 };
        targetRef.current = { x: 700, y: 500 };
      } catch (e) {
        console.error("Init error:", e);
      }
      setMounted(true);
    };
    init();
  }, []);

  // Load sessions and active session on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessionList = await invoke<Session[]>("get_sessions");
        setSessions(sessionList);
        const activeId = await invoke<string | null>("get_active_session");
        setActiveSessionId(activeId);
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    };
    loadSessions();
  }, []);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu]);

  // Random blinking animation
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };

    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 5000;
      setTimeout(() => {
        blink();
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
  }, []);

  // Listen for currentTool changes and update animation
  useEffect(() => {
    if (currentTool?.tool_name) {
      const category = getToolCategory(currentTool.tool_name);
      setToolAnimation(category);
    } else {
      setToolAnimation("");
    }
  }, [currentTool]);

  // Fixed position at bottom-right - no roaming animation
  useEffect(() => {
    if (!mounted) return;

    const syncPosition = async () => {
      try {
        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        currentPosRef.current = { x: pos.x, y: pos.y };
        targetRef.current = { x: pos.x, y: pos.y };
      } catch (e) {
        // Silent fail
      }
    };

    syncPosition();
  }, [mounted]);

  // Trigger interaction animation
  const triggerInteraction = useCallback((type: InteractionType) => {
    if (type === "spin") {
      setShowStars(true);
      setTimeout(() => setShowStars(false), 600);
    }
    setInteraction(type);
    setTimeout(() => setInteraction(null), 600);
  }, []);

  // Handle mouse down - start drag or long press
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      isLongPressRef.current = false;

      // Long press detection
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        triggerInteraction("squish");
      }, 500);

      const handleMouseMove = async (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > 10 && !moved) {
          moved = true;
          // Cancel long press timer
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
          }
          isDraggingRef.current = true;
          try {
            const win = getCurrentWindow();
            await win.startDragging();
          } catch (err) {
            console.error("Drag error:", err);
          }
        }
      };

      const handleMouseUp = async () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);

        // Cancel long press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }

        if (!moved && !isLongPressRef.current) {
          // Check for double click
          const now = Date.now();
          if (now - lastClickTimeRef.current < 300) {
            // Double click - spin
            triggerInteraction("spin");
          } else {
            // Single click - bounce (delayed to detect double click)
            setTimeout(() => {
              if (!isDraggingRef.current) {
                triggerInteraction("bounce");
              }
            }, 300);
          }
          lastClickTimeRef.current = now;
        }

        isDraggingRef.current = false;
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
  }, [triggerInteraction]);

  // Handle click - open mini chat on single click
  const handleClick = useCallback(async (_e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        currentPosRef.current = { x: pos.x, y: pos.y };
        targetRef.current = { x: pos.x, y: pos.y };
      } catch (err) {
        currentPosRef.current = { x: 700, y: 500 };
        targetRef.current = { x: 700, y: 500 };
      }
    }
  }, []);

  // Handle right-click - show context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setMenuTab("pets");
    // Reload sessions when menu opens
    invoke<Session[]>("get_sessions").then(setSessions).catch(console.error);
    invoke<string | null>("get_active_session").then(setActiveSessionId).catch(console.error);
  }, []);

  // Switch pet
  const handleSwitchPet = useCallback((type: PetType) => {
    setPetType(type);
    localStorage.setItem(PET_TYPE_KEY, type);
    setShowContextMenu(false);
  }, []);

  // Switch session
  const handleSwitchSession = useCallback(async (sessionId: string) => {
    try {
      await invoke("set_active_session", { sessionId });
      setActiveSessionId(sessionId);
      setShowContextMenu(false);
    } catch (e) {
      console.error("Failed to switch session:", e);
    }
  }, []);

  const getAnimationClass = () => {
    if (interaction) return interaction;
    return "";
  };

  return (
    <div
      className="pet-container"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
        {/* Context Menu */}
        <ContextMenu
          show={showContextMenu}
          activeTab={menuTab}
          onTabChange={setMenuTab}
          pets={PET_PRESETS}
          currentPetType={petType}
          onSelectPet={(type) => handleSwitchPet(type as PetType)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSwitchSession}
          onClose={() => setShowContextMenu(false)}
        />

        <div className="tool-bubble-wrapper">
          <ToolBubble toolName={currentTool?.tool_name ?? null} details={currentTool?.details ?? null} visible={!!currentTool?.tool_name} />
        </div>
        <div className={`pet-ghost ${state} ${toolAnimation}`}>
          <EmojiPetRenderer
            type={petType}
            isBlinking={isBlinking}
            interaction={interaction}
            className={`pet-svg ${getAnimationClass()}`}
          />
          <div className={`state-bubble ${state}`}>
            {getStateEmoji(petType, state)}
          </div>
        </div>
        {showStars && (
          <>
            <span className="star-particle" style={{ top: "10%", left: "20%" }}>✨</span>
            <span className="star-particle" style={{ top: "5%", left: "60%" }}>✨</span>
            <span className="star-particle" style={{ top: "30%", left: "80%" }}>✨</span>
            <span className="star-particle" style={{ top: "50%", left: "10%" }}>✨</span>
            <span className="star-particle" style={{ top: "60%", left: "75%" }}>✨</span>
          </>
        )}
    </div>
  );
}

export default Pet;
