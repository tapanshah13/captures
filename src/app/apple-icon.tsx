import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", position: "relative", width: 180, height: 180, borderRadius: 39.375, background: "#100c0b" }}>
      <div style={{ display: "flex", position: "absolute", inset: 0, transform: "rotate(-8deg)", transformOrigin: "90px 90px" }}>
        <div style={{ display: "flex", position: "absolute", left: 45, top: 30.9375, width: 90, height: 112.5, borderRadius: 5.625, background: "#f4f1ea" }}>
          <div style={{ display: "flex", position: "absolute", left: 11.25, top: 11.25, width: 67.5, height: 67.5, background: "linear-gradient(to bottom, #3b4a8a 0%, #ff7a4a 60%, #2a1a14 100%)" }}>
            <div style={{ position: "absolute", left: 22.5, top: 33.75, width: 22.5, height: 22.5, borderRadius: "50%", background: "#ffd27a" }} />
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
