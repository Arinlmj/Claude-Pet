export type PetType = "bunny" | "cat" | "raccoon" | "peacock";

export interface PetConfig {
  type: PetType;
  name: string;
  emoji: string;
}

// 预设宠物列表
export const PET_PRESETS: PetConfig[] = [
  { type: "bunny", name: "小兔子", emoji: "🐰" },
  { type: "cat", name: "小猫咪", emoji: "😺" },
  { type: "raccoon", name: "小浣熊", emoji: "🦝" },
  { type: "peacock", name: "小孔雀", emoji: "🦚" },
];

interface PetRendererProps {
  type: PetType;
  isBlinking: boolean;
  interaction: "bounce" | "spin" | "squish" | "angry" | null;
  className?: string;
}

// 小兔子
function BunnyEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <>
      <ellipse cx="36" cy="50" rx="8" ry={isBlinking ? "1" : "9"} fill="#333" />
      <ellipse cx="64" cy="50" rx="8" ry={isBlinking ? "1" : "9"} fill="#333" />
      {!isBlinking && (
        <>
          <ellipse cx="34" cy="47" rx="3" ry="3.5" fill="#fff" />
          <ellipse cx="62" cy="47" rx="3" ry="3.5" fill="#fff" />
        </>
      )}
    </>
  );
}

function BunnyBody({ interaction }: { interaction: string }) {
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" className={interaction}>
      <defs>
        <linearGradient id="bunny-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff5f5" />
          <stop offset="100%" stopColor="#ffe4e6" />
        </linearGradient>
        <linearGradient id="bunny-ear" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#ffe4e6" />
        </linearGradient>
        <linearGradient id="bunny-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffccd5" />
          <stop offset="100%" stopColor="#ffb4c2" />
        </linearGradient>
      </defs>

      {/* 左耳 */}
      <ellipse cx="32" cy="25" rx="10" ry="22" fill="url(#bunny-ear)" />
      <ellipse cx="32" cy="25" rx="5" ry="16" fill="url(#bunny-ear-inner)" />
      {/* 右耳 */}
      <ellipse cx="68" cy="25" rx="10" ry="22" fill="url(#bunny-ear)" />
      <ellipse cx="68" cy="25" rx="5" ry="16" fill="url(#bunny-ear-inner)" />

      {/* 头 */}
      <ellipse cx="50" cy="60" rx="32" ry="28" fill="url(#bunny-body)" />
      <ellipse cx="50" cy="63" rx="18" ry="14" fill="#fff" />

      {/* 鼻子 */}
      <ellipse cx="50" cy="62" rx="4" ry="3" fill="#ffb4c2" />
      {/* 嘴巴 */}
      <path d="M 46 65 Q 48 68 50 66 Q 52 68 54 65" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 兔牙 */}
      <rect x="47" y="67" width="3" height="4" rx="1" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
      <rect x="51" y="67" width="3" height="4" rx="1" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
      {/* 胡须 */}
      <line x1="22" y1="58" x2="12" y2="55" stroke="#ccc" strokeWidth="0.8" />
      <line x1="22" y1="61" x2="12" y2="61" stroke="#ccc" strokeWidth="0.8" />
      <line x1="22" y1="64" x2="12" y2="67" stroke="#ccc" strokeWidth="0.8" />
      <line x1="78" y1="58" x2="88" y2="55" stroke="#ccc" strokeWidth="0.8" />
      <line x1="78" y1="61" x2="88" y2="61" stroke="#ccc" strokeWidth="0.8" />
      <line x1="78" y1="64" x2="88" y2="67" stroke="#ccc" strokeWidth="0.8" />
      {/* 腮红 */}
      <ellipse cx="26" cy="64" rx="6" ry="4" fill="rgba(255, 182, 193, 0.5)" />
      <ellipse cx="74" cy="64" rx="6" ry="4" fill="rgba(255, 182, 193, 0.5)" />
    </svg>
  );
}

// 小猫咪
function CatEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <>
      <ellipse cx="38" cy="45" rx="6" ry={isBlinking ? "1" : "8"} fill="#333" />
      <ellipse cx="62" cy="45" rx="6" ry={isBlinking ? "1" : "8"} fill="#333" />
      {!isBlinking && (
        <>
          <ellipse cx="38" cy="45" rx="2" ry="6" fill="#4ade80" />
          <ellipse cx="62" cy="45" rx="2" ry="6" fill="#4ade80" />
        </>
      )}
    </>
  );
}

// 小浣熊
function RaccoonEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <>
      <ellipse cx="36" cy="50" rx="7" ry={isBlinking ? "1" : "8"} fill="#333" />
      <ellipse cx="64" cy="50" rx="7" ry={isBlinking ? "1" : "8"} fill="#333" />
      {!isBlinking && (
        <>
          <ellipse cx="34" cy="48" rx="2.5" ry="3" fill="#fff" />
          <ellipse cx="62" cy="48" rx="2.5" ry="3" fill="#fff" />
        </>
      )}
    </>
  );
}

// 小孔雀
function PeacockEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <>
      <ellipse cx="38" cy="55" rx="5" ry={isBlinking ? "1" : "6"} fill="#333" />
      <ellipse cx="62" cy="55" rx="5" ry={isBlinking ? "1" : "6"} fill="#333" />
      {!isBlinking && (
        <>
          <ellipse cx="37" cy="54" rx="2" ry="2" fill="#fff" />
          <ellipse cx="61" cy="54" rx="2" ry="2" fill="#fff" />
        </>
      )}
    </>
  );
}

// 通用表情渲染
function getEyes(type: PetType, isBlinking: boolean, interaction: string) {
  if (interaction === "bounce") {
    // 开心眯眼
    switch (type) {
      case "bunny":
        return (
          <>
            <path d="M 32 48 Q 38 42 44 48" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 56 48 Q 62 42 68 48" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "cat":
        return (
          <>
            <path d="M 32 45 Q 38 40 44 45" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 56 45 Q 62 40 68 45" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "raccoon":
        return (
          <>
            <path d="M 30 48 Q 36 42 42 48" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 58 48 Q 64 42 70 48" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "peacock":
        return (
          <>
            <path d="M 34 55 Q 38 50 42 55" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 58 55 Q 62 50 66 55" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
    }
  }

  if (interaction === "angry") {
    // 生气
    switch (type) {
      case "bunny":
        return (
          <>
            <ellipse cx="36" cy="50" rx="5" ry="4" fill="#333" />
            <ellipse cx="64" cy="50" rx="5" ry="4" fill="#333" />
          </>
        );
      case "cat":
        return (
          <>
            <ellipse cx="38" cy="45" rx="6" ry="4" fill="#333" />
            <ellipse cx="62" cy="45" rx="6" ry="4" fill="#333" />
          </>
        );
      case "raccoon":
        return (
          <>
            <ellipse cx="36" cy="48" rx="5" ry="4" fill="#333" />
            <ellipse cx="64" cy="48" rx="5" ry="4" fill="#333" />
          </>
        );
      case "peacock":
        return (
          <>
            <ellipse cx="38" cy="55" rx="4" ry="3" fill="#333" />
            <ellipse cx="62" cy="55" rx="4" ry="3" fill="#333" />
          </>
        );
    }
  }

  // 正常眨眼
  switch (type) {
    case "bunny":
      return <BunnyEyes isBlinking={isBlinking} />;
    case "cat":
      return <CatEyes isBlinking={isBlinking} />;
    case "raccoon":
      return <RaccoonEyes isBlinking={isBlinking} />;
    case "peacock":
      return <PeacockEyes isBlinking={isBlinking} />;
  }
}

export function PetRenderer({ type, isBlinking, interaction, className }: PetRendererProps) {
  const interactionClass = className || "";

  switch (type) {
    case "bunny":
      return (
        <svg viewBox="0 0 100 100" width="80" height="80" className={interactionClass}>
          <defs>
            <linearGradient id="bunny-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff5f5" />
              <stop offset="100%" stopColor="#ffe4e6" />
            </linearGradient>
            <linearGradient id="bunny-ear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor="#ffe4e6" />
            </linearGradient>
            <linearGradient id="bunny-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffccd5" />
              <stop offset="100%" stopColor="#ffb4c2" />
            </linearGradient>
          </defs>
          <ellipse cx="32" cy="25" rx="10" ry="22" fill="url(#bunny-ear)" />
          <ellipse cx="32" cy="25" rx="5" ry="16" fill="url(#bunny-ear-inner)" />
          <ellipse cx="68" cy="25" rx="10" ry="22" fill="url(#bunny-ear)" />
          <ellipse cx="68" cy="25" rx="5" ry="16" fill="url(#bunny-ear-inner)" />
          <ellipse cx="50" cy="60" rx="32" ry="28" fill="url(#bunny-body)" />
          <ellipse cx="50" cy="63" rx="18" ry="14" fill="#fff" />
          {getEyes(type, isBlinking, interaction || "")}
          <ellipse cx="50" cy="62" rx="4" ry="3" fill="#ffb4c2" />
          <path d="M 46 65 Q 48 68 50 66 Q 52 68 54 65" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="47" y="67" width="3" height="4" rx="1" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          <rect x="51" y="67" width="3" height="4" rx="1" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          <line x1="22" y1="58" x2="12" y2="55" stroke="#ccc" strokeWidth="0.8" />
          <line x1="22" y1="61" x2="12" y2="61" stroke="#ccc" strokeWidth="0.8" />
          <line x1="22" y1="64" x2="12" y2="67" stroke="#ccc" strokeWidth="0.8" />
          <line x1="78" y1="58" x2="88" y2="55" stroke="#ccc" strokeWidth="0.8" />
          <line x1="78" y1="61" x2="88" y2="61" stroke="#ccc" strokeWidth="0.8" />
          <line x1="78" y1="64" x2="88" y2="67" stroke="#ccc" strokeWidth="0.8" />
          <ellipse cx="26" cy="64" rx="6" ry="4" fill="rgba(255, 182, 193, 0.5)" />
          <ellipse cx="74" cy="64" rx="6" ry="4" fill="rgba(255, 182, 193, 0.5)" />
        </svg>
      );

    case "cat":
      return (
        <svg viewBox="0 0 100 100" width="80" height="80" className={interactionClass}>
          <defs>
            <linearGradient id="cat-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffb347" />
              <stop offset="100%" stopColor="#ff8c42" />
            </linearGradient>
            <linearGradient id="cat-inner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffcccc" />
              <stop offset="100%" stopColor="#ffaaaa" />
            </linearGradient>
          </defs>
          <path d="M 20 35 L 25 10 L 40 30 Z" fill="url(#cat-body)" />
          <path d="M 80 35 L 75 10 L 60 30 Z" fill="url(#cat-body)" />
          <path d="M 24 32 L 27 18 L 37 30 Z" fill="url(#cat-inner)" />
          <path d="M 76 32 L 73 18 L 63 30 Z" fill="url(#cat-inner)" />
          <ellipse cx="50" cy="55" rx="35" ry="30" fill="url(#cat-body)" />
          <ellipse cx="50" cy="58" rx="20" ry="15" fill="#ffeedd" />
          {getEyes(type, isBlinking, interaction || "")}
          <path d="M 47 58 L 50 62 L 53 58 Z" fill="#ff6b9d" />
          <path d="M 50 62 Q 45 67 42 65" stroke="#333" strokeWidth="1.5" fill="none" />
          <path d="M 50 62 Q 55 67 58 65" stroke="#333" strokeWidth="1.5" fill="none" />
          <line x1="25" y1="55" x2="10" y2="52" stroke="#333" strokeWidth="1" />
          <line x1="25" y1="58" x2="10" y2="58" stroke="#333" strokeWidth="1" />
          <line x1="25" y1="61" x2="10" y2="64" stroke="#333" strokeWidth="1" />
          <line x1="75" y1="55" x2="90" y2="52" stroke="#333" strokeWidth="1" />
          <line x1="75" y1="58" x2="90" y2="58" stroke="#333" strokeWidth="1" />
          <line x1="75" y1="61" x2="90" y2="64" stroke="#333" strokeWidth="1" />
          <ellipse cx="28" cy="60" rx="5" ry="3" fill="rgba(255, 150, 150, 0.4)" />
          <ellipse cx="72" cy="60" rx="5" ry="3" fill="rgba(255, 150, 150, 0.4)" />
        </svg>
      );

    case "raccoon":
      return (
        <svg viewBox="0 0 100 100" width="80" height="80" className={interactionClass}>
          <defs>
            <linearGradient id="raccoon-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#888888" />
              <stop offset="100%" stopColor="#666666" />
            </linearGradient>
            <linearGradient id="raccoon-face" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eeeeee" />
            </linearGradient>
          </defs>

          {/* 耳朵 */}
          <ellipse cx="25" cy="32" rx="10" ry="12" fill="url(#raccoon-body)" />
          <ellipse cx="75" cy="32" rx="10" ry="12" fill="url(#raccoon-body)" />
          <ellipse cx="25" cy="32" rx="5" ry="7" fill="#333" />
          <ellipse cx="75" cy="32" rx="5" ry="7" fill="#333" />

          {/* 头部 */}
          <ellipse cx="50" cy="55" rx="35" ry="30" fill="url(#raccoon-body)" />

          {/* 白色面部区域 */}
          <ellipse cx="50" cy="60" rx="25" ry="22" fill="url(#raccoon-face)" />

          {/* 黑色眼罩 - 浣熊的标志性特征 */}
          <ellipse cx="35" cy="52" rx="14" ry="10" fill="#333" />
          <ellipse cx="65" cy="52" rx="14" ry="10" fill="#333" />

          {/* 眼睛 */}
          {getEyes(type, isBlinking, interaction || "")}

          {/* 鼻子 */}
          <ellipse cx="50" cy="62" rx="6" ry="5" fill="#333" />
          <ellipse cx="50" cy="61" rx="2" ry="1.5" fill="#666" />

          {/* 嘴巴 */}
          <path d="M 44 67 Q 50 72 56 67" stroke="#333" strokeWidth="1.5" fill="none" />

          {/* 腮红 */}
          <ellipse cx="22" cy="62" rx="5" ry="3" fill="rgba(255, 150, 150, 0.4)" />
          <ellipse cx="78" cy="62" rx="5" ry="3" fill="rgba(255, 150, 150, 0.4)" />

          {/* 额头灰色条纹 */}
          <ellipse cx="50" cy="40" rx="6" ry="4" fill="#888" />
        </svg>
      );

    case "peacock":
      return (
        <svg viewBox="0 0 100 100" width="80" height="80" className={interactionClass}>
          <defs>
            <linearGradient id="peacock-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e90ff" />
              <stop offset="100%" stopColor="#0066cc" />
            </linearGradient>
            <linearGradient id="peacock-crest" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#ff8c00" />
            </linearGradient>
          </defs>
          <ellipse cx="35" cy="18" rx="3" ry="8" fill="url(#peacock-crest)" />
          <ellipse cx="42" cy="16" rx="3" ry="9" fill="url(#peacock-crest)" />
          <ellipse cx="50" cy="15" rx="3" ry="10" fill="url(#peacock-crest)" />
          <ellipse cx="58" cy="16" rx="3" ry="9" fill="url(#peacock-crest)" />
          <ellipse cx="65" cy="18" rx="3" ry="8" fill="url(#peacock-crest)" />
          <ellipse cx="50" cy="45" rx="20" ry="18" fill="url(#peacock-body)" />
          <ellipse cx="50" cy="48" rx="12" ry="10" fill="#b0e0e6" />
          {getEyes(type, isBlinking, interaction || "")}
          <path d="M 47 52 L 50 58 L 53 52 Z" fill="#ffd700" />
          <ellipse cx="50" cy="68" rx="15" ry="12" fill="url(#peacock-body)" />
          <ellipse cx="32" cy="50" rx="4" ry="3" fill="rgba(255, 215, 0, 0.5)" />
          <ellipse cx="68" cy="50" rx="4" ry="3" fill="rgba(255, 215, 0, 0.5)" />
        </svg>
      );

    default:
      return <BunnyBody interaction={interaction || ""} />;
  }
}

export function getStateEmoji(type: PetType, state: string): string {
  if (state === "thinking") return "💭";
  if (state === "typing") return "✏️";
  if (state === "waiting") return "⏳";
  if (state === "error") return "❌";
  if (state === "idle") {
    switch (type) {
      case "bunny": return "🐰";
      case "cat": return "😺";
      case "raccoon": return "🦝";
      case "peacock": return "🦚";
      default: return "🐰";
    }
  }
  return "🐰";
}
