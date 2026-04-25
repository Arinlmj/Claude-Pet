import "./EmojiPet.css";

export type PetType = "bunny" | "cat" | "dog" | "hamster" | "rabbit" | "panda" | "koala" | "owl";

export interface PetConfig {
  type: PetType;
  name: string;
  emoji: string;
  secondaryEmoji?: string;
}

export const PET_PRESETS: PetConfig[] = [
  { type: "bunny", name: "小兔子", emoji: "🐰", secondaryEmoji: "🥕" },
  { type: "cat", name: "小猫咪", emoji: "🐱", secondaryEmoji: "🐟" },
  { type: "dog", name: "小奶狗", emoji: "🐶", secondaryEmoji: "🦴" },
  { type: "hamster", name: "小仓鼠", emoji: "🐹", secondaryEmoji: "🌻" },
  { type: "rabbit", name: "垂耳兔", emoji: "🐇", secondaryEmoji: "🥬" },
  { type: "panda", name: "小熊猫", emoji: "🐼", secondaryEmoji: "🎋" },
  { type: "koala", name: "小考拉", emoji: "🐨", secondaryEmoji: "🌿" },
  { type: "owl", name: "小猫头鹰", emoji: "🦉", secondaryEmoji: "🌙" },
];

interface PetRendererProps {
  type: PetType;
  isBlinking: boolean;
  interaction: "bounce" | "spin" | "squish" | "angry" | null;
  className?: string;
}

function getPetConfig(type: PetType): PetConfig {
  return PET_PRESETS.find(p => p.type === type) || PET_PRESETS[0];
}

export function EmojiPetRenderer({ type, isBlinking, interaction, className }: PetRendererProps) {
  const pet = getPetConfig(type);
  const isBlinkingClass = isBlinking ? "blinking" : "";

  const getInteractionClass = () => {
    if (!interaction) return "";
    return interaction;
  };

  return (
    <div className={`emoji-pet-container ${className || ""}`}>
      {/* 装饰背景 */}
      <div className="pet-glow" />
      <div className="pet-sparkles">
        <span className="sparkle s1">✨</span>
        <span className="sparkle s2">⭐</span>
        <span className="sparkle s3">✨</span>
      </div>

      {/* 主宠物 emoji */}
      <div className={`pet-emoji-wrapper ${getInteractionClass()} ${isBlinkingClass}`}>
        <span className="pet-emoji-main">{pet.emoji}</span>
        {pet.secondaryEmoji && (
          <span className="pet-emoji-accessory">{pet.secondaryEmoji}</span>
        )}
      </div>

      {/* 状态气泡 */}
      <div className="pet-shadow" />
    </div>
  );
}

export function getStateEmoji(type: PetType, state: string): string {
  if (state === "thinking") return "💭";
  if (state === "typing") return "✏️";
  if (state === "waiting") return "⏳";
  if (state === "error") return "❌";
  if (state === "idle") {
    const pet = getPetConfig(type);
    return pet.emoji;
  }
  return getPetConfig(type).emoji;
}
