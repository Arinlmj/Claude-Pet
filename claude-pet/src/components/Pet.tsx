import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import HoverInfoPanel from "./HoverInfoPanel";
import { usePetState } from "../hooks/usePetState";
import "./Pet.css";

type InteractionType = "bounce" | "spin" | "squish" | "angry" | null;

interface PetProps {
  onHoverChange?: (isHovering: boolean) => void;
}

function Pet({ onHoverChange }: PetProps) {
  const { state } = usePetState();
  const [isBlinking, setIsBlinking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interaction, setInteraction] = useState<InteractionType>(null);
  const [showStars, setShowStars] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const currentPosRef = useRef({ x: 1100, y: 650 });
  const targetRef = useRef({ x: 1100, y: 650 });
  const isDraggingRef = useRef(false);

  // Click detection refs
  const lastClickTimeRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

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
            // Single click - open mini chat and bounce (delayed to detect double click)
            setTimeout(() => {
              if (!isDraggingRef.current) {
                triggerInteraction("bounce");
                handleSingleClick();
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

  // Handle single click - open mini chat window
  const handleSingleClick = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      // Open mini chat near pet position
      await invoke("open_mini_chat", { x: pos.x, y: pos.y + 130 });
    } catch (err) {
      console.error("Failed to open mini chat:", err);
    }
  }, []);

  // Handle right-click - angry
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    triggerInteraction("angry");
  }, [triggerInteraction]);

  // Get eye expression based on interaction state
  const getEyeExpression = () => {
    if (interaction === "bounce") {
      // Happy squinting eyes ^_^
      return (
        <>
          <path d="M 32 45 Q 38 38 44 45" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 56 45 Q 62 38 68 45" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    }
    if (interaction === "angry") {
      // Angry flat eyes
      return (
        <>
          <ellipse cx="38" cy="45" rx="6" ry="3" fill="#333" />
          <ellipse cx="62" cy="45" rx="6" ry="3" fill="#333" />
        </>
      );
    }
    // Normal blinking eyes
    return (
      <>
        <ellipse cx="38" cy="45" rx="6" ry={isBlinking ? "1" : "8"} fill="#333" className="eye" />
        <ellipse cx="62" cy="45" rx="6" ry={isBlinking ? "1" : "8"} fill="#333" className="eye" />
      </>
    );
  };

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
      onMouseEnter={() => {
        setIsHovering(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        onHoverChange?.(false);
      }}
    >
        <HoverInfoPanel visible={isHovering} />
        <div className={`pet-ghost ${state}`} style={{ zIndex: 1 }}>
          <svg
            viewBox="0 0 100 100"
            width="80"
            height="80"
            className={`pet-svg ${getAnimationClass()}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSingleClick();
            }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="ghost-body" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(200, 200, 255, 1)" />
                <stop offset="100%" stopColor="rgba(150, 150, 220, 1)" />
              </linearGradient>
            </defs>

            <path
              className="ghost-path"
              d="M 25 85 L 25 40 Q 25 15 50 15 Q 75 15 75 40 L 75 85
                 L 68 78 L 62 85 L 56 78 L 50 85 L 44 78 L 38 85 L 32 78 Z"
              fill="url(#ghost-body)"
            />

            {getEyeExpression()}
            <ellipse cx="30" cy="55" rx="5" ry="3" fill="rgba(255, 150, 150, 0.35)" />
            <ellipse cx="70" cy="55" rx="5" ry="3" fill="rgba(255, 150, 150, 0.35)" />
          </svg>
          <div className={`state-bubble ${state}`}>
            {state === "thinking" && "💭"}
            {state === "typing" && "✏️"}
            {state === "waiting" && "⏳"}
            {state === "error" && "❌"}
            {state === "idle" && "😴"}
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
