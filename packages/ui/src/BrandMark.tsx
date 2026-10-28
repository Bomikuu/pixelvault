import { useId } from "react";
/** Authored vector interpretation of the supplied P/keyhole board; not an original designer export. */
export function BrandMark({
  compact = false,
  inverse = false,
  className = "",
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const uid = useId().replaceAll(":", "");
  return (
    <span className={`brand-lockup ${className}`}>
      <svg
        width="38"
        height="44"
        viewBox="0 0 72 84"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={uid}
            x1="7"
            y1="72"
            x2="60"
            y2="5"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#0866ff" />
            <stop offset="1" stopColor="#398bff" />
          </linearGradient>
        </defs>
        <path
          d="M13 2h23c21 0 35 14 35 34S57 69 44 69V35c0-4-3-7-7-7H2V15C2 8 7 2 13 2Z"
          fill={`url(#${uid})`}
        />
        <path
          d="M2 35h19v21c0 4 3 7 7 7h12v7c0 8-7 14-15 14h-8C9 84 2 77 2 69V35Z"
          fill="#0866ff"
        />
        <path
          d="M36 41a5 5 0 0 1 3 9l1 9h-8l1-9a5 5 0 0 1 3-9Z"
          fill="#0866ff"
        />
      </svg>
      {!compact && (
        <span
          className="brand-word"
          style={{ color: inverse ? "#f8fafc" : undefined }}
        >
          Pixel<span>Vault</span>
        </span>
      )}
    </span>
  );
}
