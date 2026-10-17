import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The logo mark (shared/ui/logo.tsx) full-bleed: iOS rounds the corners itself.
const BARS = [
  { x: 11, y: 20, h: 8, opacity: 0.5 },
  { x: 18.5, y: 13, h: 22, opacity: 1 },
  { x: 26, y: 17, h: 14, opacity: 0.75 },
  { x: 33.5, y: 21, h: 6, opacity: 0.5 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#4fe3b5" }}>
        <svg viewBox="0 0 48 48" width="180" height="180">
          {BARS.map((bar) => (
            <rect key={bar.x} x={bar.x} y={bar.y} width="5" height={bar.h} rx="2.5" fill="#05291f" opacity={bar.opacity} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
