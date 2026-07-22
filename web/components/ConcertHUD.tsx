"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConcertZone } from "@/lib/concertZones";
import { getZoneAction } from "@/lib/clubActivities";
import type { ReactionEvent } from "@/hooks/useConcertRoom";
import type { EmoteType } from "@/lib/types";

const QUICK_CHAT = ["Let's go! 🔥", "This is fire! 🎉", "Amazing set! 🔊", "Drop the bass! 🎧"];
const REACTIONS = ["❤️", "🔥", "🎉", "⚡", "👏", "😂"];

type ConcertHUDProps = {
  connected: boolean;
  playerCount: number;
  activeZone: ConcertZone | null;
  dropUntil: number;
  energy: number;
  partyUntil: number;
  reactions: ReactionEvent[];
  onReaction: (emoji: string) => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  mouseLookActive: boolean;
  onEmote: (emote: EmoteType) => void;
  onChat: (text: string) => void;
  onHype: () => void;
  onLeave: () => void;
  onInteract: () => void;
  /** Phone / tablet layout — hides keyboard-centric controls. */
  compact?: boolean;
};

export function ConcertHUD({
  connected,
  playerCount,
  activeZone,
  dropUntil,
  energy,
  partyUntil,
  reactions,
  onReaction,
  musicEnabled,
  onToggleMusic,
  mouseLookActive,
  onEmote,
  onChat,
  onHype,
  onLeave,
  onInteract,
  compact = false,
}: ConcertHUDProps) {
  const [chatInput, setChatInput] = useState("");
  const [hypeCooldown, setHypeCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());
  const dropActive = dropUntil > now;
  const partyActive = partyUntil > now;

  // Realtime clock ticker for smooth timers/bars
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  const hypeSecondsLeft = useMemo(() => {
    if (hypeCooldown <= now) return 0;
    return Math.ceil((hypeCooldown - now) / 1000);
  }, [hypeCooldown, now]);

  const hypeProgress = useMemo(() => {
    if (hypeCooldown <= now) return 100;
    const total = 12000;
    const remaining = hypeCooldown - now;
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  }, [hypeCooldown, now]);

  function triggerHype() {
    if (hypeSecondsLeft > 0) return;
    onHype();
    setHypeCooldown(Date.now() + 12000);
  }

  function submitChat(event: React.FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onChat(text);
    setChatInput("");
  }

  const zoneAction = activeZone ? getZoneAction(activeZone.id) : null;

  return (
    <>
      {/* Top Bar Navigation & Info */}
      <div
        style={{
          position: "absolute",
          top: compact ? 8 : 16,
          left: compact ? 8 : 16,
          right: compact ? 8 : 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        <div style={{ display: "grid", gap: compact ? 6 : 10, pointerEvents: "none", minWidth: 0, flex: 1 }}>
          {/* Main Concert Status Box */}
          <div
            style={{
              pointerEvents: "auto",
              background: "rgba(10, 11, 18, 0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: compact ? 12 : 16,
              padding: compact ? "10px 12px" : "14px 18px",
              minWidth: compact ? 0 : 240,
              maxWidth: compact ? "min(210px, 58vw)" : undefined,
              boxShadow: dropActive
                ? "0 0 30px rgba(244, 114, 182, 0.35), inset 0 0 15px rgba(244, 114, 182, 0.15)"
                : "0 8px 32px rgba(0, 0, 0, 0.4)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5, color: "#fff" }}>
                PULSE CLUB
              </div>
              {/* Simulated Equalizer Graphic */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
                <span className="eq-bar" style={{ width: 3, height: "60%", background: "#ec4899", borderRadius: 2 }} />
                <span className="eq-bar" style={{ width: 3, height: "100%", background: "#8b5cf6", borderRadius: 2 }} />
                <span className="eq-bar" style={{ width: 3, height: "40%", background: "#06b6d4", borderRadius: 2 }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connected ? "#10b981" : "#f59e0b",
                  boxShadow: connected ? "0 0 8px #10b981" : "none",
                }}
              />
              <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 500 }}>
                {connected ? `${playerCount} Attendees Online` : "Connecting to server..."}
              </span>
            </div>

            {/* Shared crowd energy meter — filled by everyone's emotes/chat/hype */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  letterSpacing: 1,
                  fontWeight: 700,
                  color: partyActive ? "#fbbf24" : "#94a3b8",
                }}
              >
                <span>{partyActive ? "🎉 PARTY MODE!" : "CROWD ENERGY"}</span>
                <span>{partyActive ? "MAX" : `${Math.round(energy)}%`}</span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.08)",
                  marginTop: 5,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: partyActive ? "100%" : `${Math.min(100, energy)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: partyActive
                      ? "linear-gradient(90deg, #fbbf24, #f472b6, #22d3ee)"
                      : "linear-gradient(90deg, #22d3ee, #a78bfa, #ec4899)",
                    transition: "width 0.5s ease",
                    boxShadow: partyActive ? "0 0 10px rgba(251, 191, 36, 0.8)" : "none",
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                {partyActive
                  ? "The whole club is going off — dance!"
                  : "Emote, chat & react together to trigger Party Mode"}
              </div>
            </div>

            {/* Dynamic Drop Status */}
            {dropActive && (
              <div
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg, rgba(244,114,182,0.2) 0%, rgba(139,92,246,0.2) 100%)",
                  border: "1px solid rgba(244, 114, 182, 0.4)",
                  color: "#f472b6",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ animation: "pulse 1s infinite" }}>🔥</span>
                HYPE DROP MULTIPLIER ACTIVE!
              </div>
            )}
          </div>

          {/* Dynamic Active Zone Banner */}
          {activeZone && (
            <div
              style={{
                pointerEvents: "none",
                background: "rgba(10, 11, 18, 0.88)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${activeZone.color}`,
                borderRadius: 14,
                padding: "12px 16px",
                maxWidth: 280,
                boxShadow: `0 0 25px ${activeZone.color}40`,
                animation: "slideIn 0.2s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeZone.color }} />
                <div style={{ color: activeZone.color, fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>
                  {activeZone.label.toUpperCase()}
                </div>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                {activeZone.hint}
                {zoneAction ? (
                  <span style={{ display: "block", marginTop: 4, color: "#fbbf24" }}>
                    Press <strong>G</strong> — {zoneAction.label}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Leave + Music controls */}
        <div style={{ pointerEvents: "auto", display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
          <button
            onClick={onToggleMusic}
            style={{
              border: musicEnabled
                ? "1px solid rgba(34, 211, 238, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.2)",
              background: musicEnabled
                ? "rgba(34, 211, 238, 0.18)"
                : "rgba(10, 11, 18, 0.85)",
              backdropFilter: "blur(8px)",
              color: musicEnabled ? "#67e8f9" : "#cbd5e1",
              borderRadius: 999,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {musicEnabled ? "🎧 DJ Live" : "🔇 Enable Music"}
          </button>
          <button
            onClick={onLeave}
            style={{
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.12)",
              backdropFilter: "blur(8px)",
              color: "#fca5a5",
              borderRadius: 999,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
          >
            Leave Club
          </button>
        </div>
      </div>

      {/* Floating live reactions from everyone in the room */}
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 180,
          width: 120,
          height: 320,
          pointerEvents: "none",
          zIndex: 60,
          overflow: "visible",
        }}
      >
        <style>{`
          @keyframes reactionFloat {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            12% { transform: translateY(-30px) scale(1.15); opacity: 1; }
            100% { transform: translateY(-280px) scale(1); opacity: 0; }
          }
        `}</style>
        {reactions.map((reaction) => {
          const drift = (hashCode(reaction.id) % 70) - 35;
          return (
            <div
              key={reaction.id}
              style={{
                position: "absolute",
                bottom: 0,
                right: 40 + drift,
                display: "grid",
                justifyItems: "center",
                gap: 2,
                animation: "reactionFloat 3.2s ease-out forwards",
              }}
            >
              <span style={{ fontSize: 30, filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))" }}>
                {reaction.emoji}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  background: "rgba(10, 11, 18, 0.7)",
                  borderRadius: 999,
                  padding: "1px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {reaction.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar Controls & Interactions */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          ...(compact
            ? {
                top: "max(72px, calc(64px + env(safe-area-inset-top)))",
                bottom: "auto",
              }
            : { bottom: 24 }),
          transform: "translateX(-50%)",
          display: "grid",
          gap: compact ? 8 : 12,
          width: compact
            ? "min(420px, calc(100vw - 16px))"
            : "min(760px, calc(100vw - 32px))",
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        {/* Live reaction buttons — broadcast to everyone instantly */}
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            gap: compact ? 4 : 6,
            justifyContent: "center",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: 2,
          }}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              title="Send a live reaction everyone sees"
              style={{
                width: compact ? 36 : 40,
                height: compact ? 36 : 40,
                flexShrink: 0,
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(10, 11, 18, 0.8)",
                backdropFilter: "blur(8px)",
                fontSize: compact ? 16 : 18,
                cursor: "pointer",
                transition: "transform 0.12s ease, border-color 0.12s ease",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Emote & Hype Bar — desktop only; mobile uses on-screen controls */}
        {!compact ? (
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {(
            [
              ["dance", "Dance 💃", "Space"],
              ["wave", "Wave 👋", "E"],
              ["cheer", "Cheer 🙌", "F"],
              ["pose", "Pose ⚡", "R"],
            ] as const
          ).map(([emote, label, key]) => (
            <button
              key={emote}
              onClick={() => onEmote(emote)}
              style={actionButtonStyle}
            >
              <span>{label}</span>
              <kbd style={keyStyle}>{key}</kbd>
            </button>
          ))}

          <button
            onClick={onInteract}
            style={{
              ...actionButtonStyle,
              borderColor: "rgba(251, 191, 36, 0.45)",
              color: "#fde68a",
            }}
          >
            <span>Interact</span>
            <kbd style={keyStyle}>G</kbd>
          </button>

          {/* Special Hype Button with Progress Gauge */}
          <button
            onClick={triggerHype}
            disabled={hypeSecondsLeft > 0}
            style={{
              ...actionButtonStyle,
              position: "relative",
              overflow: "hidden",
              borderColor: hypeSecondsLeft > 0 ? "rgba(244, 114, 182, 0.2)" : "#f472b6",
              color: hypeSecondsLeft > 0 ? "#94a3b8" : "#fff",
              background: hypeSecondsLeft > 0 ? "rgba(10, 11, 18, 0.85)" : "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
              boxShadow: hypeSecondsLeft === 0 ? "0 0 20px rgba(236, 72, 153, 0.5)" : "none",
            }}
          >
            {/* Progress Fill Background */}
            {hypeSecondsLeft > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${hypeProgress}%`,
                  background: "rgba(244, 114, 182, 0.15)",
                  transition: "width 0.1s linear",
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1, fontWeight: 700 }}>
              {hypeSecondsLeft > 0 ? `Hype (${hypeSecondsLeft}s)` : "Hype Drop 🔥"}
            </span>
            <kbd style={{ ...keyStyle, position: "relative", zIndex: 1 }}>H</kbd>
          </button>
        </div>
        ) : null}

        {/* Quick Chat & Custom Input Bar */}
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(10, 11, 18, 0.75)",
            backdropFilter: "blur(12px)",
            padding: compact ? "6px 8px" : "8px 12px",
            borderRadius: compact ? 14 : 999,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {!compact ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_CHAT.map((phrase) => (
              <button
                key={phrase}
                onClick={() => onChat(phrase)}
                style={chipButtonStyle}
              >
                {phrase}
              </button>
            ))}
          </div>
          ) : null}

          {!compact ? (
          <div style={{ width: 1, height: 20, background: "rgba(255, 255, 255, 0.15)", margin: "0 4px" }} />
          ) : null}

          <form onSubmit={submitChat} style={{ display: "flex", gap: 6, flexGrow: 1, maxWidth: compact ? "100%" : 300, width: compact ? "100%" : undefined }}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={compact ? "Chat…" : "Type message..."}
              maxLength={40}
              style={{
                flexGrow: 1,
                padding: compact ? "10px 12px" : "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.4)",
                color: "white",
                fontSize: 16, // 16px avoids iOS zoom on focus
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                ...chipButtonStyle,
                background: "#6366f1",
                borderColor: "#818cf8",
                color: "white",
                fontWeight: 600,
                minHeight: 40,
              }}
            >
              Send
            </button>
          </form>
        </div>

        {/* Navigation Helper Footer */}
        {!compact ? (
        <div
          style={{
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: 11,
            letterSpacing: 0.5,
            pointerEvents: "none",
          }}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 600 }}>[WASD]</span> Walk ·{" "}
          <span style={{ color: "#f472b6", fontWeight: 600 }}>Drag / move mouse</span> Turn ·{" "}
          <span style={{ color: "#fbbf24", fontWeight: 600 }}>G</span> Interact · Quests bottom-right
        </div>
        ) : null}
      </div>
    </>
  );
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  background: "rgba(10, 11, 18, 0.85)",
  backdropFilter: "blur(8px)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "all 0.15s ease",
  userSelect: "none",
};

const keyStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.15)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 4,
  padding: "2px 6px",
  fontSize: 10,
  fontFamily: "monospace",
  color: "#e2e8f0",
};

const chipButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.05)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  transition: "all 0.15s ease",
};