"use client";

import type { PlayerSnapshot } from "@/lib/types";

type VoicePanelProps = {
  seated: boolean;
  micReady: boolean;
  micError: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onStand: () => void;
  localSessionId: string | null;
  participants: PlayerSnapshot[];
  speakingIds: Set<string>;
  connectedIds: Set<string>;
  mobile?: boolean;
};

/** Clubhouse-style panel shown while sitting in the voice lounge. */
export function VoicePanel({
  seated,
  micReady,
  micError,
  muted,
  onToggleMute,
  onStand,
  localSessionId,
  participants,
  speakingIds,
  connectedIds,
  mobile = false,
}: VoicePanelProps) {
  if (!seated) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: mobile ? 8 : 16,
        ...(mobile
          ? { top: "max(56px, calc(50px + env(safe-area-inset-top)))", bottom: "auto" }
          : { bottom: 24 }),
        width: mobile ? "min(200px, calc(100vw - 120px))" : 250,
        padding: mobile ? "10px 12px" : "14px 16px",
        fontSize: mobile ? 12 : undefined,
        background: "rgba(6, 24, 20, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(52, 211, 153, 0.45)",
        borderRadius: 16,
        padding: "14px 16px",
        zIndex: 60,
        boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)",
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.8, color: "#6ee7b7" }}>
          🎙️ VOICE LOUNGE
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: micReady ? "rgba(16, 185, 129, 0.2)" : "rgba(251, 191, 36, 0.15)",
            color: micReady ? "#34d399" : "#fbbf24",
          }}
        >
          {micReady ? "LIVE" : "CONNECTING"}
        </span>
      </div>

      {micError ? (
        <div
          style={{
            fontSize: 11,
            color: "#fca5a5",
            background: "rgba(127, 29, 29, 0.35)",
            borderRadius: 8,
            padding: "6px 10px",
            marginBottom: 10,
            lineHeight: 1.4,
          }}
        >
          {micError}
        </div>
      ) : null}

      {/* Participants */}
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {participants.map((player) => {
          const isLocal = player.sessionId === localSessionId;
          const isSpeaking = speakingIds.has(player.sessionId);
          const isConnected = isLocal || connectedIds.has(player.sessionId);

          return (
            <div
              key={player.sessionId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 10,
                background: isSpeaking
                  ? "rgba(16, 185, 129, 0.18)"
                  : "rgba(255, 255, 255, 0.04)",
                border: isSpeaking
                  ? "1px solid rgba(52, 211, 153, 0.6)"
                  : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isSpeaking ? "#34d399" : isConnected ? "#64748b" : "#f59e0b",
                  boxShadow: isSpeaking ? "0 0 8px #34d399" : "none",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {player.name}
                {isLocal ? " (you)" : ""}
              </span>
              {isSpeaking ? (
                <span style={{ marginLeft: "auto", fontSize: 11 }}>🔊</span>
              ) : null}
            </div>
          );
        })}
        {participants.length <= 1 ? (
          <div style={{ fontSize: 11, color: "#94a3b8", padding: "2px 4px" }}>
            You&apos;re alone here — invite others to sit down and talk!
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onToggleMute}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 999,
            border: muted
              ? "1px solid rgba(239, 68, 68, 0.5)"
              : "1px solid rgba(52, 211, 153, 0.5)",
            background: muted ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
            color: muted ? "#fca5a5" : "#6ee7b7",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {muted ? "🔇 Unmute" : "🎙️ Mute"}
        </button>
        <button
          onClick={onStand}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.06)",
            color: "#e2e8f0",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          🚶 Stand Up
        </button>
      </div>
    </div>
  );
}
