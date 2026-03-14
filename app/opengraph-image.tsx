import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Collvy — Your team's workspace"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo / wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>C</span>
          </div>
          <span style={{ color: "white", fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px" }}>
            Collvy
          </span>
        </div>

        {/* Headline */}
        <div style={{
          color: "white",
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-2px",
          maxWidth: 900,
          marginBottom: 28,
        }}>
          Your team&apos;s workspace,{" "}
          <span style={{ color: "#a78bfa" }}>unified.</span>
        </div>

        {/* Subline */}
        <div style={{
          color: "#94a3b8",
          fontSize: 26,
          fontWeight: 400,
          lineHeight: 1.4,
          maxWidth: 740,
        }}>
          Kanban boards, team docs, and task planning — all in one place.
          Open source and self-hostable.
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12, marginTop: 48 }}>
          {["Kanban", "Docs", "Planner", "Open source"].map((tag) => (
            <div key={tag} style={{
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 999,
              padding: "8px 20px",
              color: "#c4b5fd",
              fontSize: 18,
              fontWeight: 500,
            }}>
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
