import type { ReactNode } from "react";

const DOODLE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" fill="none" stroke="black" stroke-width="2" stroke-linecap="round">
    <circle cx="30" cy="28" r="10"/>
    <path d="M60 20 l14 14 -14 14 -14-14z"/>
    <path d="M100 18 q12 -14 24 0 t24 0"/>
    <path d="M170 14 v22 M159 25 h22"/>
    <path d="M18 70 h26 v18 h-26z M18 70 l13 12 13-12"/>
    <path d="M70 66 c14 0 14 20 0 20 c-14 0 -14 -20 0 -20"/>
    <path d="M110 62 l8 20 8-20"/>
    <circle cx="165" cy="74" r="12"/>
    <path d="M160 74 l4 5 8-10"/>
    <path d="M24 120 q16 -18 32 0 q-16 18 -32 0"/>
    <path d="M78 112 v22 M78 112 h20 v10 h-20"/>
    <path d="M120 116 a12 12 0 1 0 12 12 h-12z"/>
    <path d="M164 112 l10 10 -10 10 -10-10z"/>
    <path d="M20 168 c10 -12 22 -12 32 0"/>
    <circle cx="36" cy="180" r="4"/>
    <path d="M74 162 h24 v18 h-16 l-8 8z"/>
    <path d="M120 164 v20 M110 174 h20"/>
    <path d="M158 162 q14 6 0 22 q-14 -16 0 -22"/>
  </svg>`,
);

export function ChatWallpaper({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-wa-chat-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,${DOODLE}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "220px 220px",
        }}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
