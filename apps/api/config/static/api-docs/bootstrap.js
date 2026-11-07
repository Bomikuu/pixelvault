/* PixelVault reference uses the project's existing blue/navy identity. */
const root = document.querySelector("#reference");
Scalar.createApiReference("#reference", {
  url: "/api/schema?format=json",
  layout: "modern",
  theme: "none",
  hideTestRequestButton: true,
  hideClientButton: true,
  showDeveloperTools: "never",
  showToolbar: "never",
  agent: { disabled: true, hideAddApi: true },
  persistAuth: false,
  telemetry: false,
  withDefaultFonts: false,
  proxyUrl: "",
  title: "PixelVault API",
  documentDownloadType: "json",
  hiddenClients: true,
  customCss: `
    /* Hallmark: app reference; theme: existing PixelVault; scope: Read. */
    @font-face { font-family: Manrope; src: url('/api/docs/assets/manrope.woff2') format('woff2'); font-weight: 400; font-display: swap; }
    :root { --scalar-font: Manrope, sans-serif; --scalar-font-code: monospace; --scalar-color-1: #0f172a; --scalar-color-2: #52637b; --scalar-color-3: #52637b; --scalar-color-accent: #0866ff; --scalar-background-1: #ffffff; --scalar-background-2: #f8fafc; --scalar-background-3: #edf3ff; --scalar-border-color: #dbe3ee; }
    .dark-mode { --scalar-color-1: #f8fafc; --scalar-color-2: #b3c0d5; --scalar-color-3: #b3c0d5; --scalar-color-accent: #76b0ff; --scalar-background-1: #0b1428; --scalar-background-2: #111e35; --scalar-background-3: #182a45; --scalar-border-color: #334965; }
    html, body { overflow-x: clip; } :focus-visible { outline: 2px solid var(--scalar-color-accent); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }
  `,
});
