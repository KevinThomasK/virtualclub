"use client";

type ChillPanelProps = {
  seated: boolean;
  onStand: () => void;
  mobile?: boolean;
};

/** Shown while lounging on the chill couch — makes the sit action obvious. */
export function ChillPanel({ seated, onStand, mobile = false }: ChillPanelProps) {
  if (!seated) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: mobile ? 8 : 16,
        ...(mobile
          ? { top: "max(120px, calc(110px + env(safe-area-inset-top)))", bottom: "auto" }
          : { bottom: 24 }),
        width: mobile ? "min(220px, calc(100vw - 140px))" : 250,
        background: "rgba(24, 16, 48, 0.94)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(167, 139, 250, 0.5)",
        borderRadius: 16,
        padding: "14px 16px",
        zIndex: 60,
        boxShadow: "0 0 30px rgba(139, 92, 246, 0.28)",
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 0.8,
            color: "#c4b5fd",
          }}
        >
          CHILL LOUNGE
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(167, 139, 250, 0.22)",
            color: "#ddd6fe",
          }}
        >
          SIPPING
        </span>
      </div>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#cbd5e1",
        }}
      >
        You’re on the couch with a neon drink. Sit back — press{" "}
        <strong style={{ color: "#fbbf24" }}>G</strong> or move with{" "}
        <strong style={{ color: "#67e8f9" }}>WASD</strong> to stand.
      </p>

      <button
        type="button"
        onClick={onStand}
        style={{
          width: "100%",
          border: "1px solid rgba(167, 139, 250, 0.45)",
          background: "rgba(91, 33, 182, 0.35)",
          color: "#ede9fe",
          borderRadius: 10,
          padding: "9px 12px",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Stand up
      </button>
    </div>
  );
}
