import { useId } from "react";

export const BADGE_ART_KEYS = [
  "first_chapter",
  "clockwork",
  "full_circle",
  "open_book",
  "helping_hand",
  "fresh_start",
  "bright_start",
  "good_neighbor",
  "shared_wisdom",
  "community_guide",
] as const;
export type BadgeArtKey = (typeof BADGE_ART_KEYS)[number];
export const BADGE_ART_DEFINITIONS = [
  { key: "first_chapter", name: "First Chapter" },
  { key: "clockwork", name: "Clockwork" },
  { key: "full_circle", name: "Full Circle" },
  { key: "open_book", name: "Open Book" },
  { key: "helping_hand", name: "Helping Hand" },
  { key: "fresh_start", name: "Fresh Start" },
  { key: "bright_start", name: "Bright Start" },
  { key: "good_neighbor", name: "Good Neighbor" },
  { key: "shared_wisdom", name: "Shared Wisdom" },
  { key: "community_guide", name: "Community Guide" },
] as const satisfies readonly { key: BadgeArtKey; name: string }[];

/** Original illustrated objects, rather than rank or creditworthiness insignia. */
export function BadgeArt({
  name,
  index = 0,
  badgeKey,
  size = 48,
  locked = false,
  className = "",
}: {
  name: string;
  index?: number;
  badgeKey?: string;
  size?: number;
  locked?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const selected = BADGE_ART_KEYS.includes(badgeKey as BadgeArtKey)
    ? (badgeKey as BadgeArtKey)
    : BADGE_ART_KEYS[
        ((index % BADGE_ART_KEYS.length) + BADGE_ART_KEYS.length) %
          BADGE_ART_KEYS.length
      ];
  const p = locked
    ? {
        ink: "#5A687A",
        paper: "#F5F4EF",
        blue: "#C1CAD5",
        pink: "#DDD7D8",
        coral: "#D3CBC4",
        yellow: "#E2DCCB",
        teal: "#C5D5CD",
        dark: "#84949F",
      }
    : {
        ink: "#192A36",
        paper: "#FFFCF3",
        blue: "#0866FF",
        pink: "#E6A2B6",
        coral: "#F15B40",
        yellow: "#EAC34C",
        teal: "#38A287",
        dark: "#82A7B8",
      };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      width={size}
      height={size}
      role="img"
      aria-label={name}
      className={`award-art award-illustration ${locked ? "is-locked" : ""} ${className}`.trim()}
      data-badge-key={selected}
      fill="none"
      stroke={p.ink}
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <defs>
        <pattern
          id={`${id}-stipple`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r=".65" fill={p.ink} stroke="none" />
          <circle cx="5" cy="5.5" r=".5" fill={p.ink} stroke="none" />
        </pattern>
        <pattern
          id={`${id}-ripple`}
          width="12"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M-3 4Q0 0 3 4T9 4T15 4" stroke={p.ink} strokeWidth=".6" />
        </pattern>
      </defs>
      {selected === "first_chapter" && (
        <>
          <ellipse
            cx="79"
            cy="136"
            rx="64"
            ry="10"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m24 108 60-23 53 25-60 27Z" fill={p.paper} />
          <path d="m24 108 53 24v15l-53-25Z" fill={p.coral} />
          <path d="m77 132 60-22v15l-60 22Z" fill={p.blue} />
          <path d="m32 91 42-13 48 18-42 18Z" fill={p.dark} />
          <path d="m32 83 41-15 47 19-40 18Z" fill={p.paper} />
          <path
            d="M80 105V76c-16-16-31-20-47-19v31c17-1 31 4 47 17Z"
            fill={p.yellow}
          />
          <path
            d="M80 105V76c10-16 25-20 44-19v31c-18 0-32 5-44 17Z"
            fill={p.paper}
          />
          <path d="M80 76c-12-16-26-22-42-22v29c15 1 28 7 42 22M80 76c13-17 25-21 39-20v28c-15 0-28 6-39 21" />
          <path
            d="m46 64 24 11m-24-2 22 10m25-10 17-7m-17 15 17-7"
            strokeWidth="1.1"
          />
          <path d="m104 60 8-3v16l-4-1-4 4Z" fill={p.coral} />
          <path d="m20 104 13-5M40 127v7m7-4v7" />
          <path
            d="M126 67V38M126 53c-13-2-18-10-18-18 13 0 19 6 18 18ZM126 45c0-13 7-21 17-22 2 12-4 21-17 22Z"
            fill={p.teal}
          />
          <path d="m117 66 20-3-3 21-13 2Z" fill={p.pink} />
          <path
            d="m120 69 13-2-2 13-9 2Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
          <circle cx="40" cy="33" r="10" fill={p.blue} />
          <path d="m37 34 2 3 5-7" stroke={p.paper} strokeWidth="2" />
        </>
      )}
      {selected === "clockwork" && (
        <>
          <ellipse
            cx="81"
            cy="139"
            rx="64"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m23 123 29-10 25 12-29 11Z" fill={p.pink} />
          <path d="m23 123 25 13v11l-25-13Z" fill={p.coral} />
          <path d="m48 136 29-11v11l-29 11Z" fill={p.paper} />
          <path d="m53 107 30-11 25 13-30 11Z" fill={p.paper} />
          <path d="m53 107 25 13v27l-25-13Z" fill={p.blue} />
          <path d="m78 120 30-11v27l-30 11Z" fill={p.dark} />
          <path d="m84 90 29-10 25 12-29 11Z" fill={p.teal} />
          <path d="m84 90 25 13v44l-25-13Z" fill={p.yellow} />
          <path d="m109 103 29-11v44l-29 11Z" fill={p.coral} />
          <path
            d="m114 107 18-7v29l-18 8Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
          <path
            d="M44 58c0-24 17-41 37-39 21 2 36 22 36 46s-17 41-37 39c-20-2-36-22-36-46Z"
            fill={p.yellow}
          />
          <path
            d="M39 60c0-24 16-41 36-39 21 2 36 22 36 46s-16 41-36 39c-20-2-36-22-36-46Z"
            fill={p.paper}
          />
          <path
            d="M47 61c0-19 12-33 28-31s28 18 28 36-12 33-28 31-28-18-28-36Z"
            fill={p.yellow}
          />
          <path d="m75 36 .1 6m0 47v-6m-22-21 5 .5m35 5.5 5 .5m-40-25 3 4m28 34 3 4m-34-4 4-3m27-29 4-3" />
          <path d="M75 49v17l13 12" strokeWidth="3" />
          <circle cx="75" cy="66" r="3" fill={p.blue} />
          <path d="m20 86 9 1m-5-5-1 10m99-61 8-3m-5-3 3 9" />
        </>
      )}
      {selected === "full_circle" && (
        <>
          <ellipse
            cx="80"
            cy="139"
            rx="61"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m28 116 52-21 53 24-52 22Z" fill={p.paper} />
          <path d="m28 116 53 25v9l-53-25Z" fill={p.teal} />
          <path d="m81 141 52-22v9l-52 22Z" fill={p.pink} />
          <path
            d="M105 42c-9-12-24-18-39-14-22 6-35 27-30 50l-11-1 21 25 15-29-12 3c-3-15 6-28 20-31 10-3 19 1 25 9Z"
            fill={p.blue}
          />
          <path
            d="M53 102c9 13 24 19 39 15 22-6 35-27 30-50l12 1-22-25-15 29 12-3c3 15-6 28-20 31-10 2-19-1-25-10Z"
            fill={p.teal}
          />
          <path
            d="m46 97 6-17m59-31-7 16M43 67c-1-13 7-25 18-29m56 43c-2 13-10 23-21 26"
            stroke={p.paper}
            strokeWidth="1.2"
          />
          <path d="m59 81 21-8 20 9-21 9Z" fill={p.yellow} />
          <path d="m59 81 20 10v15L59 96Z" fill={p.coral} />
          <path d="m79 91 21-9v15l-21 9Z" fill={p.pink} />
          <path d="M71 74V60l8-5 9 5v14" fill={p.paper} />
          <path d="m73 64 5 5 9-11" stroke={p.teal} strokeWidth="2.8" />
          <path
            d="m83 95 12-5v8l-12 5Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
          <circle cx="137" cy="102" r="4" fill={p.yellow} />
          <circle cx="22" cy="38" r="3" fill={p.pink} />
        </>
      )}
      {selected === "open_book" && (
        <>
          <ellipse
            cx="83"
            cy="140"
            rx="62"
            ry="9"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m22 113 61-21 55 24-61 23Z" fill={p.yellow} />
          <path d="m22 113 55 26v10l-55-26Z" fill={p.pink} />
          <path d="m77 139 61-23v10l-61 23Z" fill={p.coral} />
          <path d="m32 47 45-16 2 84-47 16Z" fill={p.teal} />
          <path d="m45 39 44-15 2 86-46 16Z" fill={p.pink} />
          <path d="m59 51 43-16 2 86-44 16Z" fill={p.paper} />
          <path d="m67 61 26-10m-26 18 26-10m-26 18 26-10m-26 18 16-6m-16 23 17-6" />
          <path d="m64 111 21-8v10l-21 8Z" fill={p.blue} />
          <path d="m45 44 9-3v9l-9 3Z" fill={p.yellow} />
          <path
            d="m118 109 17 18c3 4-3 11-7 7l-19-20Z"
            fill={p.blue}
            strokeWidth="2"
          />
          <circle cx="105" cy="91" r="25" fill={p.dark} />
          <circle cx="102" cy="89" r="24" fill={p.yellow} />
          <circle cx="102" cy="89" r="18" fill={p.paper} />
          <path d="m91 87 7 7 14-15" stroke={p.teal} strokeWidth="3" />
          <path d="M89 82a16 16 0 0 1 14-9" stroke={p.paper} strokeWidth="2" />
          <path d="m119 37 7-7m-2 10 8 1" />
        </>
      )}
      {selected === "helping_hand" && (
        <>
          <ellipse
            cx="80"
            cy="140"
            rx="63"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m28 117 51-18 54 25-51 19Z" fill={p.teal} />
          <path d="m28 117 54 26v8l-54-26Z" fill={p.blue} />
          <path d="m82 143 51-19v8l-51 19Z" fill={p.dark} />
          <path d="m23 96 12-14 17 6-7 30-11-3Z" fill={p.coral} />
          <path
            d="m45 93 16-8 19 3 16-5c7-2 11 5 4 9l-20 7-15 1 22 5c5 1 7 5 3 8l-15 8-17-1-17-13Z"
            fill={p.yellow}
          />
          <path d="m55 107 18 6 15-3M46 109l9 4m-20-23 8 3" />
          <path d="m87 70 19-9 19 8-18 9Z" fill={p.paper} />
          <path d="m87 70 20 8v19l-20-9Z" fill={p.pink} />
          <path d="m107 78 18-9v19l-18 9Z" fill={p.blue} />
          <path d="m94 73 7-3 8 3-7 4Z" fill={p.yellow} />
          <path
            d="m107 67 1-20M108 57c-14 1-23-7-23-18 14-1 23 6 23 18ZM108 49c0-15 8-24 21-25 0 15-7 24-21 25Z"
            fill={p.teal}
          />
          <path d="m91 45 13 9m8-10 11-13" strokeWidth=".8" />
          <path
            d="M32 31c0-7 6-12 13-12h16c8 0 14 5 14 12v10c0 7-6 12-14 12H49l-12 9 1-11c-4-2-6-5-6-10Z"
            fill={p.paper}
          />
          <path d="m43 32 7-2 5 3 6-2v12l-6 2-5-3-7 2Z" fill={p.blue} />
          <path d="M50 30v12" stroke={p.paper} />
          <path
            d="m113 106 11 5-17 7-11-5Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
        </>
      )}
      {selected === "fresh_start" && (
        <>
          <ellipse
            cx="80"
            cy="140"
            rx="63"
            ry="9"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m28 117 52-21 53 24-52 22Z" fill={p.paper} />
          <path d="m28 117 53 25v9l-53-25Z" fill={p.pink} />
          <path d="m81 142 52-22v9l-52 22Z" fill={p.blue} />
          <path
            d="M51 111V54c0-20 11-34 27-34h7c17 0 28 14 28 34v57l-9 4H60Z"
            fill={p.yellow}
          />
          <path
            d="M51 114V55c0-20 11-33 26-33s27 13 27 33v59Z"
            fill={p.coral}
          />
          <path
            d="M60 111V56c0-16 6-25 17-25 12 0 18 9 18 25v55Z"
            fill={p.paper}
          />
          <path d="M60 86c10-13 23-15 35-6v31H60Z" fill={p.teal} />
          <path d="m60 111 20-16 15 5v11Z" fill={p.dark} />
          <circle cx="78" cy="61" r="10" fill={p.yellow} />
          <path d="M78 43v-5m13 10 4-4m-30 4-4-4" />
          <path d="m59 115 27-10 25 11-28 11Z" fill={p.yellow} />
          <path d="m59 115 24 12v9l-24-12Z" fill={p.coral} />
          <path d="m83 127 28-11v9l-28 11Z" fill={p.pink} />
          <path d="m87 132 26-10 21 10-26 10Z" fill={p.paper} />
          <path d="m87 132 21 10v8l-21-10Z" fill={p.dark} />
          <path d="m108 142 26-10v8l-26 10Z" fill={p.teal} />
          <path d="m32 105 13 4-2 20-10-4Z" fill={p.yellow} />
          <path
            d="M38 106V85m0 12c-9-1-15-7-14-15 9 0 15 6 14 15Zm0-5c-1-11 5-18 13-19 2 10-4 18-13 19Z"
            fill={p.teal}
          />
          <path d="m106 26 7-4m-4-1 2 7" />
        </>
      )}
      {selected === "bright_start" && (
        <>
          <ellipse
            cx="80"
            cy="141"
            rx="62"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m22 116 56-21 59 25-56 23Z" fill={p.paper} />
          <path d="m22 116 59 27v9l-59-27Z" fill={p.blue} />
          <path d="m81 143 56-23v9l-56 23Z" fill={p.pink} />
          <path d="M46 73a34 34 0 0 1 68 0Z" fill={p.yellow} />
          <path d="M52 73a28 28 0 0 1 56 0" stroke={p.coral} />
          <path
            d="M80 27V15m-23 19-7-10m-9 30-12-5m74-15 7-10m9 30 12-5"
            strokeWidth="2"
          />
          <path d="m70 59 4 1m13 0 4-1m-16 9q5 5 10 0" />
          <path d="m38 100 42-14 45 18-43 17Z" fill={p.coral} />
          <path d="m38 100 44 21v10l-44-21Z" fill={p.yellow} />
          <path d="m82 121 43-17v10l-43 17Z" fill={p.blue} />
          <path
            d="M81 116V83c-13-13-28-16-44-16v33c17-1 32 5 44 16Z"
            fill={p.paper}
          />
          <path
            d="M81 116V83c12-14 26-18 44-18v34c-18 1-32 6-44 17Z"
            fill={p.teal}
          />
          <path
            d="m46 80 24 10m-24-1 24 10m24-9 20-8m-20 17 20-8"
            strokeWidth="1.1"
          />
          <path d="m105 74 8-3v20l-4-2-4 5Z" fill={p.yellow} />
          <path d="m28 112 9-3m89-37 10-4m-5-3 1 10" />
          <path
            d="m88 136 39-16v5l-39 16Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
        </>
      )}
      {selected === "good_neighbor" && (
        <>
          <ellipse
            cx="80"
            cy="141"
            rx="64"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m22 117 56-21 59 25-56 23Z" fill={p.teal} />
          <path d="m22 117 59 27v8l-59-27Z" fill={p.blue} />
          <path d="m81 144 56-23v8l-56 23Z" fill={p.dark} />
          <path
            d="M20 60c0-9 6-15 15-15h32c10 0 16 6 16 15v20c0 8-6 14-15 14H45L31 106l2-13c-8-1-13-7-13-14Z"
            fill={p.paper}
          />
          <path
            d="M76 37c0-9 7-15 17-15h28c9 0 15 6 15 15v20c0 9-6 15-15 15h-14L93 84l1-12h-2c-10 0-16-6-16-15Z"
            fill={p.pink}
          />
          <path d="m39 61 11-4 13 5v18l-13-5-11 4Z" fill={p.blue} />
          <path d="M50 57v18" stroke={p.paper} />
          <path
            d="M105 57V42m0 8c-9 0-14-5-14-13 9 0 14 5 14 13Zm0-4c0-10 6-16 14-17 1 10-5 17-14 17Z"
            fill={p.teal}
          />
          <path d="m41 109 12-5 12 6v19l-12 5-12-6Z" fill={p.yellow} />
          <path d="m53 114 12-4m-12 4v20m-10-23 10 3" />
          <path d="m89 108 22-8 17 8-22 9Z" fill={p.paper} />
          <path d="m89 108 17 9v14l-17-9Z" fill={p.coral} />
          <path d="m106 117 22-9v14l-22 9Z" fill={p.yellow} />
          <path
            d="m94 119 7 3v4l-7-3Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
          <path d="m67 118 11-4m-5-4 1 9m64-26 5-2" />
        </>
      )}
      {selected === "shared_wisdom" && (
        <>
          <ellipse
            cx="80"
            cy="141"
            rx="65"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m20 118 59-22 61 26-59 23Z" fill={p.yellow} />
          <path d="m20 118 61 27v8l-61-27Z" fill={p.coral} />
          <path d="m81 145 59-23v8l-59 23Z" fill={p.pink} />
          <path d="m34 37 79-15 15 7-80 16Z" fill={p.paper} />
          <path d="m34 37 14 8v84l-14-8Z" fill={p.blue} />
          <path d="m48 45 80-16v84l-80 16Z" fill={p.teal} />
          <path d="m55 52 65-13v29l-65 13Z" fill={p.dark} />
          <path d="m55 88 65-13v29l-65 13Z" fill={p.paper} />
          <path d="m59 57 9-2v22l-9 2Z" fill={p.yellow} />
          <path d="m70 55 10-2v22l-10 2Z" fill={p.pink} />
          <path d="m83 53 9-2v22l-9 2Z" fill={p.coral} />
          <path d="m95 53 9-4 8 19-9 4Z" fill={p.blue} />
          <path d="m62 63 3-1m8 6 4-1m8-9 4-1" strokeWidth="1" />
          <path d="m63 92 13-3 1 24-14 3Z" fill={p.pink} />
          <path d="m81 88 14-3 1 25-14 3Z" fill={p.yellow} />
          <path d="m100 84 12-3 1 25-12 3Z" fill={p.blue} />
          <path
            d="m67 97 5-1m-5 6 5-1m13-9 5-1m-5 6 5-1m13-9 5-1m-5 6 5-1"
            strokeWidth="1.1"
          />
          <path
            d="m52 118 73-15v7l-73 15Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
          <path
            d="M30 80c-8-4-14-12-13-20 9 0 15 8 13 20Zm0-8c-1-11 5-17 12-19 2 10-3 17-12 19Z"
            fill={p.teal}
          />
          <path d="m22 82 16-3-1 18-13 3Z" fill={p.yellow} />
          <path d="m126 47 6-2m-4-4 1 8" />
        </>
      )}
      {selected === "community_guide" && (
        <>
          <ellipse
            cx="80"
            cy="141"
            rx="65"
            ry="8"
            fill={p.ink}
            stroke="none"
            opacity=".1"
          />
          <path d="m21 118 57-21 61 25-58 23Z" fill={p.paper} />
          <path d="m21 118 60 27v8l-60-27Z" fill={p.pink} />
          <path d="m81 145 58-23v8l-58 23Z" fill={p.blue} />
          <path d="m28 108 33-12 32 13-34 13Z" fill={p.teal} />
          <path d="m28 108 31 14v13l-31-14Z" fill={p.blue} />
          <path d="m59 122 34-13v13l-34 13Z" fill={p.paper} />
          <path d="m34 99 34-12 31 13-34 13Z" fill={p.yellow} />
          <path d="m34 99 31 14v9l-31-14Z" fill={p.coral} />
          <path d="m65 113 34-13v9l-34 13Z" fill={p.pink} />
          <path d="M57 51V37c0-9 7-14 15-14s15 5 15 14v14" strokeWidth="3" />
          <path d="m48 54 24-10 24 10-24 10Z" fill={p.yellow} />
          <path d="m48 54 24 10v40l-24-11Z" fill={p.coral} />
          <path d="m72 64 24-10v39l-24 11Z" fill={p.blue} />
          <path d="m54 63 13 6v25l-13-6Z" fill={p.paper} />
          <path d="m77 69 13-6v25l-13 6Z" fill={p.yellow} />
          <path d="m48 93 24 11 24-11v9l-24 11-24-11Z" fill={p.yellow} />
          <path d="M60 82c-7-5-7-13-3-18 2 7 10 9 9 17" fill={p.yellow} />
          <path d="m67 41 5-2 5 2v5l-5 2-5-2Z" fill={p.teal} />
          <path d="M117 122V57" strokeWidth="3" />
          <path d="m106 58 25-5 7 7-7 8-25 5Z" fill={p.teal} />
          <path d="m103 78 25-5v14l-25 5-6-6Z" fill={p.pink} />
          <path d="m112 61 11-2m-15 24 11-2" stroke={p.paper} />
          <path d="m108 125 17-6 8 4-18 7Z" fill={p.yellow} />
          <path d="m27 48 8 3m-3-8-2 11m66-22 6-4" />
          <path
            d="m39 115 14 6v6l-14-6Z"
            fill={`url(#${id}-stipple)`}
            stroke="none"
          />
        </>
      )}
    </svg>
  );
}
