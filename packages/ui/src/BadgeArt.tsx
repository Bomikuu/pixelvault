import { BookOpen, Clock3, Check, Eye, HandHeart, Sprout } from "lucide-react";
const icons = [BookOpen, Clock3, Check, Eye, HandHeart, Sprout];
export function BadgeArt({
  name,
  index = 0,
  size = 48,
}: {
  name: string;
  index?: number;
  size?: number;
}) {
  const Icon = icons[index % icons.length];
  return (
    <span
      className={`award-art award-${index % 6}`}
      role="img"
      aria-label={name}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 60 64" fill="none" aria-hidden="true">
        <path
          d="M30 3 52 15v26L30 59 8 41V15L30 3Z"
          fill="currentColor"
          fillOpacity=".1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="m30 9 17 10v19L30 52 13 38V19L30 9Z"
          stroke="currentColor"
          strokeOpacity=".3"
        />
      </svg>
      <Icon size={size * 0.4} aria-hidden="true" />
    </span>
  );
}
