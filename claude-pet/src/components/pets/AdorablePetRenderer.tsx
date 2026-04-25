import "./AdorablePet.css";

export type PetType = "bunny" | "cat" | "kitten" | "puppy";

export interface PetConfig {
  type: PetType;
  name: string;
  emoji: string;
}

export const PET_PRESETS: PetConfig[] = [
  { type: "bunny", name: "小兔子", emoji: "🐰" },
  { type: "cat", name: "乖巧猫", emoji: "😺" },
  { type: "kitten", name: "小奶猫", emoji: "🐱" },
  { type: "puppy", name: "小奶狗", emoji: "🐶" },
];

interface PetRendererProps {
  type: PetType;
  isBlinking: boolean;
  interaction: "bounce" | "spin" | "squish" | "angry" | null;
  className?: string;
}

// 小兔子 - 更精美版本
function BunnyPet({ isBlinking, interaction, className }: { isBlinking: boolean; interaction: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width="100" height="100" className={`pet-svg bunny ${interaction || ""} ${className || ""}`}>
      <defs>
        {/* 身体渐变 */}
        <radialGradient id="bunny-body-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fff5f5" />
          <stop offset="100%" stopColor="#ffe4e6" />
        </radialGradient>
        {/* 耳朵内部渐变 */}
        <linearGradient id="bunny-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffccd5" />
          <stop offset="100%" stopColor="#ffb4c2" />
        </linearGradient>
        {/* 腮红渐变 */}
        <radialGradient id="blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb4c2" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffb4c2" stopOpacity="0" />
        </radialGradient>
        {/* 身体阴影 */}
        <filter id="body-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#d4a5a5" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* 耳朵 */}
      <g className="ear-left">
        <ellipse cx="38" cy="28" rx="12" ry="28" fill="url(#bunny-body-grad)" filter="url(#body-shadow)"/>
        <ellipse cx="38" cy="28" rx="6" ry="20" fill="url(#bunny-ear-inner)" className="ear-inner-left"/>
      </g>
      <g className="ear-right">
        <ellipse cx="82" cy="28" rx="12" ry="28" fill="url(#bunny-body-grad)" filter="url(#body-shadow)"/>
        <ellipse cx="82" cy="28" rx="6" ry="20" fill="url(#bunny-ear-inner)" className="ear-inner-right"/>
      </g>

      {/* 头部 */}
      <ellipse cx="60" cy="70" rx="38" ry="35" fill="url(#bunny-body-grad)" filter="url(#body-shadow)"/>

      {/* 白色脸部高光 */}
      <ellipse cx="60" cy="75" rx="22" ry="18" fill="#fff"/>

      {/* 眼睛 */}
      <g className="eyes">
        {isBlinking ? (
          // 眨眼状态
          <>
            <path d="M 42 65 Q 50 68 58 65" stroke="#4a4a4a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 62 65 Q 70 68 78 65" stroke="#4a4a4a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </>
        ) : interaction === "angry" ? (
          // 生气状态
          <>
            <ellipse cx="48" cy="65" rx="6" ry="5" fill="#4a4a4a"/>
            <ellipse cx="72" cy="65" rx="6" ry="5" fill="#4a4a4a"/>
            <ellipse cx="46" cy="64" rx="2" ry="2" fill="#fff"/>
            <ellipse cx="70" cy="64" rx="2" ry="2" fill="#fff"/>
          </>
        ) : (
          // 正常状态
          <>
            <ellipse cx="48" cy="65" rx="8" ry="10" fill="#4a4a4a"/>
            <ellipse cx="72" cy="65" rx="8" ry="10" fill="#4a4a4a"/>
            <ellipse cx="46" cy="63" rx="3" ry="4" fill="#fff"/>
            <ellipse cx="70" cy="63" rx="3" ry="4" fill="#fff"/>
            {/* 眼睛高光 */}
            <ellipse cx="50" cy="62" rx="2" ry="2" fill="#fff" opacity="0.8"/>
            <ellipse cx="74" cy="62" rx="2" ry="2" fill="#fff" opacity="0.8"/>
          </>
        )}
      </g>

      {/* 鼻子 */}
      <ellipse cx="60" cy="76" rx="5" ry="4" fill="#ffb4c2"/>
      <ellipse cx="59" cy="75" rx="2" ry="1.5" fill="#ffd6dd"/>

      {/* 嘴巴 */}
      <path d="M 55 80 Q 58 84 60 82 Q 62 84 65 80" stroke="#d4a5a5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* 胡须 */}
      <g className="whiskers" opacity="0.6">
        <line x1="25" y1="72" x2="10" y2="68" stroke="#ccc" strokeWidth="0.8"/>
        <line x1="25" y1="76" x2="10" y2="76" stroke="#ccc" strokeWidth="0.8"/>
        <line x1="25" y1="80" x2="10" y2="84" stroke="#ccc" strokeWidth="0.8"/>
        <line x1="95" y1="72" x2="110" y2="68" stroke="#ccc" strokeWidth="0.8"/>
        <line x1="95" y1="76" x2="110" y2="76" stroke="#ccc" strokeWidth="0.8"/>
        <line x1="95" y1="80" x2="110" y2="84" stroke="#ccc" strokeWidth="0.8"/>
      </g>

      {/* 腮红 */}
      <ellipse cx="32" cy="78" rx="8" ry="5" fill="url(#blush)" className="blush-left"/>
      <ellipse cx="88" cy="78" rx="8" ry="5" fill="url(#blush)" className="blush-right"/>
    </svg>
  );
}

// 乖巧猫 - 更精美版本
function CatPet({ isBlinking, interaction, className }: { isBlinking: boolean; interaction: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width="100" height="100" className={`pet-svg cat ${interaction || ""} ${className || ""}`}>
      <defs>
        <radialGradient id="cat-body-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffd4a3" />
          <stop offset="100%" stopColor="#ffb366" />
        </radialGradient>
        <radialGradient id="cat-face-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff5eb" />
          <stop offset="100%" stopColor="#ffe4cc" />
        </radialGradient>
        <linearGradient id="cat-ear-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd4a3" />
          <stop offset="100%" stopColor="#ff9933" />
        </linearGradient>
        <linearGradient id="cat-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffb3b3" />
          <stop offset="100%" stopColor="#ff8080" />
        </linearGradient>
        <radialGradient id="cat-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff9999" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff9999" stopOpacity="0" />
        </radialGradient>
        <filter id="cat-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#cc8533" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* 耳朵 */}
      <g className="cat-ears">
        <path d="M 25 45 L 35 10 L 50 40 Z" fill="url(#cat-ear-grad)" filter="url(#cat-shadow)"/>
        <path d="M 30 42 L 36 20 L 47 40 Z" fill="url(#cat-ear-inner)"/>
        <path d="M 95 45 L 85 10 L 70 40 Z" fill="url(#cat-ear-grad)" filter="url(#cat-shadow)"/>
        <path d="M 90 42 L 84 20 L 73 40 Z" fill="url(#cat-ear-inner)"/>
      </g>

      {/* 头部 */}
      <ellipse cx="60" cy="65" rx="40" ry="35" fill="url(#cat-body-grad)" filter="url(#cat-shadow)"/>
      <ellipse cx="60" cy="70" rx="25" ry="20" fill="url(#cat-face-grad)"/>

      {/* 眼睛 */}
      <g className="cat-eyes">
        {isBlinking ? (
          <>
            <path d="M 40 60 Q 48 64 56 60" stroke="#4a4a4a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 64 60 Q 72 64 80 60" stroke="#4a4a4a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </>
        ) : interaction === "angry" ? (
          <>
            <ellipse cx="46" cy="60" rx="7" ry="5" fill="#4a4a4a"/>
            <ellipse cx="74" cy="60" rx="7" ry="5" fill="#4a4a4a"/>
            <line x1="38" y1="55" x2="54" y2="58" stroke="#4a4a4a" strokeWidth="2"/>
            <line x1="82" y1="55" x2="66" y2="58" stroke="#4a4a4a" strokeWidth="2"/>
          </>
        ) : (
          <>
            {/* 竖瞳 */}
            <ellipse cx="46" cy="60" rx="7" ry="10" fill="#4a4a4a"/>
            <ellipse cx="74" cy="60" rx="7" ry="10" fill="#4a4a4a"/>
            <ellipse cx="46" cy="60" rx="2.5" ry="7" fill="#2d8a2d"/>
            <ellipse cx="74" cy="60" rx="2.5" ry="7" fill="#2d8a2d"/>
            <ellipse cx="44" cy="57" rx="2" ry="2.5" fill="#fff"/>
            <ellipse cx="72" cy="57" rx="2" ry="2.5" fill="#fff"/>
          </>
        )}
      </g>

      {/* 鼻子 */}
      <path d="M 57 72 L 60 76 L 63 72 Z" fill="#ff6b9d"/>

      {/* 嘴巴 */}
      <path d="M 60 76 Q 52 82 48 78" stroke="#d4a5a5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M 60 76 Q 68 82 72 78" stroke="#d4a5a5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* 胡须 */}
      <g className="cat-whiskers" opacity="0.7">
        <line x1="25" y1="70" x2="8" y2="65" stroke="#ccc" strokeWidth="1"/>
        <line x1="25" y1="74" x2="8" y2="74" stroke="#ccc" strokeWidth="1"/>
        <line x1="25" y1="78" x2="8" y2="83" stroke="#ccc" strokeWidth="1"/>
        <line x1="95" y1="70" x2="112" y2="65" stroke="#ccc" strokeWidth="1"/>
        <line x1="95" y1="74" x2="112" y2="74" stroke="#ccc" strokeWidth="1"/>
        <line x1="95" y1="78" x2="112" y2="83" stroke="#ccc" strokeWidth="1"/>
      </g>

      {/* 腮红 */}
      <ellipse cx="30" cy="75" rx="7" ry="4" fill="url(#cat-blush)" className="cat-blush-left"/>
      <ellipse cx="90" cy="75" rx="7" ry="4" fill="url(#cat-blush)" className="cat-blush-right"/>

      {/* 尾巴 */}
      <g className="cat-tail">
        <path d="M 95 85 Q 115 80 110 60 Q 108 50 115 45" stroke="url(#cat-body-grad)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// 小奶猫 - 更圆润可爱
function KittenPet({ isBlinking, interaction, className }: { isBlinking: boolean; interaction: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width="100" height="100" className={`pet-svg kitten ${interaction || ""} ${className || ""}`}>
      <defs>
        <radialGradient id="kitten-body-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
        <radialGradient id="kitten-face-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f5f5" />
        </radialGradient>
        <linearGradient id="kitten-ear-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </linearGradient>
        <linearGradient id="kitten-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffccd5" />
          <stop offset="100%" stopColor="#ffb3c1" />
        </linearGradient>
        <radialGradient id="kitten-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb3c1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffb3c1" stopOpacity="0" />
        </radialGradient>
        <filter id="kitten-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#a0a0a0" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* 耳朵 - 更圆更可爱 */}
      <g className="kitten-ears">
        <ellipse cx="32" cy="35" rx="14" ry="16" fill="url(#kitten-ear-grad)" filter="url(#kitten-shadow)"/>
        <ellipse cx="32" cy="35" rx="8" ry="10" fill="url(#kitten-ear-inner)"/>
        <ellipse cx="88" cy="35" rx="14" ry="16" fill="url(#kitten-ear-grad)" filter="url(#kitten-shadow)"/>
        <ellipse cx="88" cy="35" rx="8" ry="10" fill="url(#kitten-ear-inner)"/>
      </g>

      {/* 头部 - 更圆 */}
      <ellipse cx="60" cy="68" rx="42" ry="38" fill="url(#kitten-body-grad)" filter="url(#kitten-shadow)"/>
      <ellipse cx="60" cy="72" rx="28" ry="24" fill="url(#kitten-face-grad)"/>

      {/* 眼睛 */}
      <g className="kitten-eyes">
        {isBlinking ? (
          <>
            <path d="M 42 62 Q 50 66 58 62" stroke="#4a4a4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M 62 62 Q 70 66 78 62" stroke="#4a4a4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </>
        ) : interaction === "angry" ? (
          <>
            <ellipse cx="46" cy="62" rx="8" ry="6" fill="#4a4a4a"/>
            <ellipse cx="74" cy="62" rx="8" ry="6" fill="#4a4a4a"/>
            <line x1="36" y1="56" x2="56" y2="60" stroke="#4a4a4a" strokeWidth="2"/>
            <line x1="84" y1="56" x2="64" y2="60" stroke="#4a4a4a" strokeWidth="2"/>
          </>
        ) : (
          <>
            {/* 大眼睛 */}
            <ellipse cx="46" cy="62" rx="10" ry="12" fill="#4a4a4a"/>
            <ellipse cx="74" cy="62" rx="10" ry="12" fill="#4a4a4a"/>
            <ellipse cx="46" cy="62" rx="4" ry="10" fill="#6eb5ff"/>
            <ellipse cx="74" cy="62" rx="4" ry="10" fill="#6eb5ff"/>
            <ellipse cx="43" cy="58" rx="3" ry="4" fill="#fff"/>
            <ellipse cx="71" cy="58" rx="3" ry="4" fill="#fff"/>
          </>
        )}
      </g>

      {/* 鼻子 */}
      <ellipse cx="60" cy="74" rx="4" ry="3" fill="#ffb3c1"/>

      {/* 嘴巴 */}
      <path d="M 56 78 Q 60 82 64 78" stroke="#d4a5a5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* 胡须 */}
      <g className="kitten-whiskers" opacity="0.5">
        <line x1="28" y1="72" x2="12" y2="68" stroke="#bbb" strokeWidth="0.8"/>
        <line x1="28" y1="76" x2="12" y2="76" stroke="#bbb" strokeWidth="0.8"/>
        <line x1="28" y1="80" x2="12" y2="84" stroke="#bbb" strokeWidth="0.8"/>
        <line x1="92" y1="72" x2="108" y2="68" stroke="#bbb" strokeWidth="0.8"/>
        <line x1="92" y1="76" x2="108" y2="76" stroke="#bbb" strokeWidth="0.8"/>
        <line x1="92" y1="80" x2="108" y2="84" stroke="#bbb" strokeWidth="0.8"/>
      </g>

      {/* 腮红 */}
      <ellipse cx="32" cy="78" rx="8" ry="5" fill="url(#kitten-blush)" className="kitten-blush-left"/>
      <ellipse cx="88" cy="78" rx="8" ry="5" fill="url(#kitten-blush)" className="kitten-blush-right"/>

      {/* 小爪子 */}
      <ellipse cx="40" cy="102" rx="10" ry="6" fill="url(#kitten-body-grad)" className="kitten-paw-left"/>
      <ellipse cx="80" cy="102" rx="10" ry="6" fill="url(#kitten-body-grad)" className="kitten-paw-right"/>
    </svg>
  );
}

// 小奶狗 - 超萌版本
function PuppyPet({ isBlinking, interaction, className }: { isBlinking: boolean; interaction: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width="100" height="100" className={`pet-svg puppy ${interaction || ""} ${className || ""}`}>
      <defs>
        <radialGradient id="puppy-body-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f5deb3" />
          <stop offset="100%" stopColor="#deb887" />
        </radialGradient>
        <radialGradient id="puppy-face-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8f0" />
          <stop offset="100%" stopColor="#ffe4c9" />
        </radialGradient>
        <linearGradient id="puppy-ear-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4a055" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <radialGradient id="puppy-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb366" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffb366" stopOpacity="0" />
        </radialGradient>
        <filter id="puppy-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#a08060" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* 耳朵 - 垂下来的狗耳朵 */}
      <g className="puppy-ears">
        <ellipse cx="25" cy="50" rx="15" ry="28" fill="url(#puppy-ear-grad)" filter="url(#puppy-shadow)" transform="rotate(-15 25 50)"/>
        <ellipse cx="95" cy="50" rx="15" ry="28" fill="url(#puppy-ear-grad)" filter="url(#puppy-shadow)" transform="rotate(15 95 50)"/>
      </g>

      {/* 头部 */}
      <ellipse cx="60" cy="65" rx="40" ry="36" fill="url(#puppy-body-grad)" filter="url(#puppy-shadow)"/>

      {/* 脸部 */}
      <ellipse cx="60" cy="72" rx="26" ry="22" fill="url(#puppy-face-grad)"/>

      {/* 眼睛 */}
      <g className="puppy-eyes">
        {isBlinking ? (
          <>
            <path d="M 42 62 Q 50 66 58 62" stroke="#4a4a4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M 62 62 Q 70 66 78 62" stroke="#4a4a4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </>
        ) : interaction === "angry" ? (
          <>
            <ellipse cx="46" cy="62" rx="7" ry="6" fill="#4a4a4a"/>
            <ellipse cx="74" cy="62" rx="7" ry="6" fill="#4a4a4a"/>
            <line x1="38" y1="56" x2="54" y2="60" stroke="#4a4a4a" strokeWidth="2"/>
            <line x1="82" y1="56" x2="66" y2="60" stroke="#4a4a4a" strokeWidth="2"/>
          </>
        ) : (
          <>
            {/* 圆圆的大眼睛 */}
            <ellipse cx="46" cy="62" rx="9" ry="11" fill="#4a4a4a"/>
            <ellipse cx="74" cy="62" rx="9" ry="11" fill="#4a4a4a"/>
            <ellipse cx="43" cy="58" rx="3.5" ry="4.5" fill="#fff"/>
            <ellipse cx="71" cy="58" rx="3.5" ry="4.5" fill="#fff"/>
          </>
        )}
      </g>

      {/* 鼻子 */}
      <ellipse cx="60" cy="74" rx="7" ry="5" fill="#4a4a4a"/>
      <ellipse cx="58" cy="73" rx="2" ry="1.5" fill="#666"/>

      {/* 嘴巴 */}
      <path d="M 53 80 Q 60 86 67 80" stroke="#d4a5a5" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <line x1="60" y1="79" x2="60" y2="84" stroke="#d4a5a5" strokeWidth="1.5"/>

      {/* 腮红 */}
      <ellipse cx="30" cy="76" rx="8" ry="5" fill="url(#puppy-blush)" className="puppy-blush-left"/>
      <ellipse cx="90" cy="76" rx="8" ry="5" fill="url(#puppy-blush)" className="puppy-blush-right"/>

      {/* 舌头 - 开心时伸出 */}
      {(interaction === "bounce" || interaction === "spin") && (
        <ellipse cx="60" cy="88" rx="6" ry="8" fill="#ff9999"/>
      )}

      {/* 尾巴 */}
      <g className="puppy-tail">
        <path d="M 90 80 Q 105 75 100 60 Q 98 50 105 45" stroke="url(#puppy-ear-grad)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

export function AdorablePetRenderer({ type, isBlinking, interaction, className }: PetRendererProps) {
  switch (type) {
    case "bunny":
      return <BunnyPet isBlinking={isBlinking} interaction={interaction} className={className} />;
    case "cat":
      return <CatPet isBlinking={isBlinking} interaction={interaction} className={className} />;
    case "kitten":
      return <KittenPet isBlinking={isBlinking} interaction={interaction} className={className} />;
    case "puppy":
      return <PuppyPet isBlinking={isBlinking} interaction={interaction} className={className} />;
    default:
      return <BunnyPet isBlinking={isBlinking} interaction={interaction} className={className} />;
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
      case "kitten": return "🐱";
      case "puppy": return "🐶";
      default: return "🐰";
    }
  }
  return "🐰";
}
