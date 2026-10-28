import { useId } from "react";

export const AVATAR_OPTIONS = [
  {
    key: "sprout",
    name: "Sprout",
    description: "A wavy bob, a green shirt and a little room to grow.",
  },
  {
    key: "navigator",
    name: "Navigator",
    description: "A blue cap, a coral jacket and a curious outlook.",
  },
  {
    key: "maker",
    name: "Maker",
    description: "A cloud of curls and sunny yellow overalls.",
  },
  {
    key: "reader",
    name: "Reader",
    description: "Round glasses, a blue jumper and a book in hand.",
  },
  {
    key: "dreamer",
    name: "Dreamer",
    description: "A yellow beret, a long braid and a pink jacket.",
  },
  {
    key: "connector",
    name: "Connector",
    description: "A high bun, bright earrings and a welcoming smile.",
  },
  {
    key: "explorer",
    name: "Explorer",
    description: "A coral beanie, a backpack and the next adventure.",
  },
  {
    key: "keeper",
    name: "Keeper",
    description: "Silver hair, easy glasses and a mustard cardigan.",
  },
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]["key"];

const PALETTES = {
  sprout: {
    background: "#E3EEE5",
    skin: "#D69B74",
    hair: "#202E39",
    shirt: "#37A285",
    trim: "#F8EBC9",
  },
  navigator: {
    background: "#DCEAFF",
    skin: "#8A523B",
    hair: "#25282B",
    shirt: "#ED634D",
    trim: "#FFFCF3",
  },
  maker: {
    background: "#F6EAC4",
    skin: "#AE6D47",
    hair: "#292723",
    shirt: "#EAC34C",
    trim: "#EBA3B6",
  },
  reader: {
    background: "#E3E7EF",
    skin: "#F1C5A3",
    hair: "#293745",
    shirt: "#0866FF",
    trim: "#FFFCF3",
  },
  dreamer: {
    background: "#F3DFE5",
    skin: "#D9A783",
    hair: "#463630",
    shirt: "#D999AD",
    trim: "#EAC34C",
  },
  connector: {
    background: "#E0ECE7",
    skin: "#71442F",
    hair: "#24292D",
    shirt: "#3DA38A",
    trim: "#ED634D",
  },
  explorer: {
    background: "#F6E6D8",
    skin: "#BD8A62",
    hair: "#394134",
    shirt: "#85A9BA",
    trim: "#EAC34C",
  },
  keeper: {
    background: "#E8E4F1",
    skin: "#B97A58",
    hair: "#DDDAD4",
    shirt: "#D6AD3B",
    trim: "#FFFCF3",
  },
} as const;

/** Friendly fictional portraits; a preset never serves as verification evidence. */
export function AvatarArt({
  avatarKey,
  size = 64,
  className = "",
  label,
}: {
  avatarKey: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const key = Object.hasOwn(PALETTES, avatarKey)
    ? (avatarKey as AvatarKey)
    : "sprout";
  const p = PALETTES[key];
  const clipId = `${useId().replace(/:/g, "")}-portrait`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label={
        label ??
        `${AVATAR_OPTIONS.find((option) => option.key === key)?.name} avatar`
      }
      className={`avatar-art ${className}`.trim()}
      data-avatar-key={key}
      fill="none"
      stroke="#192A36"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="64" cy="64" r="63" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d="M0 0h128v128H0Z" fill={p.background} stroke="none" />
        <path
          d="M-5 100c27-17 42-10 55-15s37-2 82 18v32H-5Z"
          fill={p.trim}
          stroke="none"
          opacity=".55"
        />
        <path d="m15 39 5-2m-1-2 1 5m87 21 4-2" strokeWidth="1" />
        {key === "sprout" && (
          <path
            d="M36 91c-8-6-12-14-9-23-9-8-7-22 2-29-4-14 6-25 19-24C62 4 74 9 80 17c16-3 26 9 22 21 13 13 5 28-2 31 3 11-3 22-13 26Z"
            fill={p.hair}
          />
        )}
        {key === "navigator" && (
          <path
            d="M37 68c-7-7-6-20 1-27-2-10 9-19 26-18 19 0 28 9 27 20 6 8 4 19-1 24Z"
            fill={p.hair}
          />
        )}
        {key === "maker" && (
          <path
            d="M32 65c-11-2-14-15-7-22-6-10 0-20 10-21 0-12 13-17 22-11 8-9 23-7 27 3 12-3 24 4 22 16 12 4 15 19 5 27 4 11-5 20-15 19l-59-1Z"
            fill={p.hair}
          />
        )}
        {key === "reader" && (
          <path
            d="M35 65c-9-10-7-24 1-32 2-16 14-23 32-20 15-6 32 4 32 20 6 10 1 23-10 33Z"
            fill={p.hair}
          />
        )}
        {key === "dreamer" && (
          <>
            <path
              d="M33 87V47c0-20 11-30 30-30s31 13 31 32v38Z"
              fill={p.hair}
            />
            <path
              d="M85 75c12 9 10 15 4 18 9 7 8 14 0 17 7 7 4 16-6 16-11-1-10-10-4-15-10-4-10-11-2-17-8-6-7-13 0-19Z"
              fill={p.hair}
            />
          </>
        )}
        {key === "connector" && (
          <>
            <path
              d="M52 26c-15-9-13-26 0-31 14-7 32-2 34 11 5 13-8 24-20 25Z"
              fill={p.hair}
            />
            <path d="M34 61c-9-21 3-43 28-43s40 18 32 44Z" fill={p.hair} />
          </>
        )}
        {key === "explorer" && (
          <path
            d="M34 64c-9-11-5-29 6-34 9-9 30-8 40-2 15 3 22 23 12 36l-5 16H40Z"
            fill={p.hair}
          />
        )}
        {key === "keeper" && (
          <path
            d="M34 62c-8-13-5-28 7-33 0-10 14-20 27-14 14-6 31 7 28 18 9 8 8 22-2 30Z"
            fill={p.hair}
          />
        )}

        <path
          d="M21 135v-20c0-18 14-29 32-31h22c19 2 33 13 33 31v20Z"
          fill={p.shirt}
        />
        {key === "explorer" && (
          <>
            <path d="M30 94c-9 2-11 17-11 36h15l4-39Z" fill="#ED634D" />
            <path d="M93 94c9 2 14 16 13 36H93l-7-39Z" fill="#ED634D" />
            <path d="m31 98 4 27m59-27-2 28" />
          </>
        )}
        <path d="M53 74v15c2 10 20 10 22 0V74Z" fill={p.skin} />
        <path
          d="M54 78c5 5 13 7 20 3v7c-8 5-15 2-20-3Z"
          fill="#192A36"
          opacity=".13"
          stroke="none"
        />
        <path
          d="M42 54c-10-5-13 11-2 15l5-1m39-14c10-5 13 11 2 15l-5-1"
          fill={p.skin}
        />
        <path
          d="M42 43c0-14 11-22 22-22 13 0 23 10 23 25v15c0 16-10 26-23 26-13 0-23-11-23-27Z"
          fill={p.skin}
        />

        {key === "sprout" && (
          <path
            d="M39 52c-9-9-4-27 7-31 6-10 23-12 34-4 13 3 15 23 7 32-6-4-7-12-9-18-5 12-17 20-31 19l7-11c-4 6-9 10-15 13Z"
            fill={p.hair}
          />
        )}
        {key === "navigator" && (
          <>
            <path
              d="M36 40c-1-18 9-28 27-28 17 0 28 12 28 28Z"
              fill="#0866FF"
            />
            <path
              d="M62 12c9 8 11 17 10 28M38 40l53-1c7 0 13 4 14 8-14 1-26-2-34-7"
              fill="#398BFF"
            />
            <path d="m51 24 10-1v8l-10 1Z" fill="#FFFCF3" />
          </>
        )}
        {key === "maker" && (
          <>
            <path
              d="M37 49c-6-2-7-10-1-14-5-9 3-16 10-13 2-9 14-11 20-3 7-7 17-4 19 4 11-1 15 10 7 18 2 8-4 12-10 10 2-8-1-13-8-16-4 8-12 12-19 7l-2-7c-5 7-10 11-16 14Z"
              fill={p.hair}
            />
            <path
              d="M53 13c-8 5-9 10-6 14m22-15c-3 3-4 7-2 11M25 42c5-1 9 2 10 6"
              stroke="#65716D"
              strokeWidth="1"
            />
          </>
        )}
        {key === "reader" && (
          <path
            d="M37 46c-8-14 2-30 17-29 12-7 25-2 30 7 9 4 11 16 5 23-18-1-31-9-35-16-2 9-8 15-17 15Z"
            fill={p.hair}
          />
        )}
        {key === "dreamer" && (
          <>
            <path
              d="M36 50c-3-12 3-26 18-27 8-9 31-3 34 10l1 18c-11-2-18-10-22-20-8 11-18 17-31 19Z"
              fill={p.hair}
            />
            <path
              d="M31 28C28 16 47 7 61 9c21-3 37 8 38 21-16 8-46 10-68-2Z"
              fill="#EAC34C"
            />
            <path d="m65 9 1-6 5 1-2 6" fill="#EAC34C" />
            <path d="M34 30c19 6 42 7 60-1" />
          </>
        )}
        {key === "connector" && (
          <>
            <path
              d="M38 50c-4-10 2-28 19-29 17-5 33 6 34 22l-7 8c-13-3-24-13-27-22-2 9-9 17-19 21Z"
              fill={p.hair}
            />
            <path d="M46 16c8 5 21 4 30-1" stroke="#ED634D" strokeWidth="4" />
            <ellipse cx="38" cy="73" rx="4" ry="7" fill="#EAC34C" />
            <ellipse cx="88" cy="73" rx="4" ry="7" fill="#EAC34C" />
          </>
        )}
        {key === "explorer" && (
          <>
            <path
              d="M35 39c-1-18 11-27 28-27 18-2 31 10 30 28Z"
              fill="#ED634D"
            />
            <path
              d="m39 23 4 14m6-18 3 18m8-20 1 20m8-19-1 19m9-16-1 16m8-11-1 11"
              strokeWidth=".9"
            />
            <path
              d="M33 37c20-4 42-4 62 0v12c-20-4-42-4-62 0Z"
              fill="#ED634D"
            />
            <path d="m72 37 12 1v8l-12-1Z" fill="#FFFCF3" />
          </>
        )}
        {key === "keeper" && (
          <>
            <path
              d="M37 49c-4-9 0-24 12-26 8-11 27-10 35 2 7 1 12 11 7 21-13-3-22-8-27-17-5 11-16 16-27 20Z"
              fill={p.hair}
            />
            <path
              d="M44 29c4 1 7 0 10-2m17-5 9 9m-5 0 9 6"
              stroke="#7B8588"
              strokeWidth="1"
            />
          </>
        )}

        <path d="m49 53 7-1m16 0 7 1" strokeWidth="1.7" />
        <path d="M53 59v3m22-3v3" strokeWidth="2.3" />
        <path d="m64 59-2 10 5 1" strokeWidth="1.2" />
        <path d="M57 75q7 5 14-1" strokeWidth="1.5" />
        {(key === "reader" || key === "keeper") && (
          <>
            <circle cx="52" cy="60" r="9" />
            <circle cx="76" cy="60" r="9" />
            <path d="M61 59q3-3 6 0m-23-2-6-2m46 2 6-2" />
          </>
        )}
        {key === "keeper" && (
          <path
            d="M46 69c0 9 7 17 18 17 10 0 16-8 17-17-4 7-9 6-17 4-8 3-13 2-18-4Z"
            fill={p.hair}
          />
        )}

        {key === "sprout" && (
          <>
            <path d="M47 91q17 14 34 0" />
            <path
              d="M87 115v-10m0 6c-7 0-10-4-10-8 7-1 10 2 10 8Zm0-4c0-7 4-11 9-11 0 7-3 11-9 11Z"
              fill="#FFFCF3"
              strokeWidth="1"
            />
            <path d="m34 111 2 17m56-17-2 17" />
          </>
        )}
        {key === "navigator" && (
          <>
            <path d="m48 88-9 15 17 6 8-13 8 13 17-6-9-15" fill={p.shirt} />
            <path d="M64 97v31m-4-16h8" stroke="#FFFCF3" />
            <path d="m28 113 9 2m54 0 10-2" />
          </>
        )}
        {key === "maker" && (
          <>
            <path
              d="M30 101c3-11 11-14 21-16l13 13 13-13c11 3 18 7 22 16v30H30Z"
              fill="#EBA3B6"
            />
            <path d="m42 90 8-3 1 19h26l1-19 8 3v40H42Z" fill={p.shirt} />
            <circle cx="47" cy="107" r="2.2" fill="#FFFCF3" />
            <circle cx="81" cy="107" r="2.2" fill="#FFFCF3" />
            <path d="M56 115h16v10H56Z" />
          </>
        )}
        {key === "reader" && (
          <>
            <path d="m47 89 17 11 17-11M64 101v8" stroke="#FFFCF3" />
            <path
              d="M43 117c10-5 17-4 21 1 6-5 14-6 24-2v20H43Z"
              fill="#EAC34C"
            />
            <path d="M64 118v18m-15-12 10 1m11-1 11-1" />
            <path
              d="M35 118c2-6 7-7 9-3l4 7-4 11-7-4Zm57-2c-2-4-6-4-8 0l-4 8 5 8 7-4Z"
              fill={p.skin}
            />
          </>
        )}
        {key === "dreamer" && (
          <>
            <path d="m50 88 14 11 13-11-1 24H51Z" fill="#FFFCF3" />
            <path d="m44 91 12 17-9 4 12 20m26-40-11 16 8 5-11 19" />
            <path d="m31 114 3 15" />
          </>
        )}
        {key === "connector" && (
          <>
            <path d="M64 98v32H25v-16c0-12 9-22 25-26Z" fill="#ED634D" />
            <path d="m48 88 16 10 15-10M64 98v30" />
            <path d="m86 111 9 4-9 4-8-4Z" fill="#EAC34C" />
          </>
        )}
        {key === "explorer" && (
          <>
            <path d="m49 89 15 9 15-9 3 14-18 8-18-8Z" fill="#FFFCF3" />
            <path d="M64 111v18m-8-10h16" />
            <path d="m90 106 9 2-1 10-9-2Z" fill="#EAC34C" />
          </>
        )}
        {key === "keeper" && (
          <>
            <path d="m51 88 13 12 14-12-1 40H50Z" fill="#FFFCF3" />
            <path d="m45 90 11 17-7 5 7 18m27-40-11 17 7 5-7 18" />
            <circle cx="63" cy="112" r="1.5" fill="#192A36" />
            <circle cx="63" cy="122" r="1.5" fill="#192A36" />
          </>
        )}
      </g>
    </svg>
  );
}
