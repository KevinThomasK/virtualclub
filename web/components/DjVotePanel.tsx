"use client";

import { useEffect, useState } from "react";
import type { DjStyle, DjVotes } from "@/hooks/useConcertRoom";

const STYLES: {
  id: DjStyle;
  label: string;
  emoji: string;
  color: string;
  hint: string;
}[] = [
  {
    id: "bass",
    label: "Bass",
    emoji: "🔊",
    color: "#f472b6",
    hint: "Heavy low-end",
  },
  {
    id: "chill",
    label: "Chill",
    emoji: "🌊",
    color: "#22d3ee",
    hint: "Laid-back",
  },
  {
    id: "hyper",
    label: "Hyper",
    emoji: "⚡",
    color: "#fbbf24",
    hint: "Max energy",
  },
];

type DjVotePanelProps = {
  visible: boolean;
  votes: DjVotes;
  myVote: DjStyle | null;
  playerCount: number;
  djMode: string;
  djModeUntil: number;
  onVote: (style: DjStyle) => void;
};

/** Shown while standing at the DJ booth — vote for the next drop style. */
export function DjVotePanel({
  visible,
  votes,
  myVote,
  playerCount,
  djMode,
  djModeUntil,
  onVote,
}: DjVotePanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const live = Boolean(djMode) && now < djModeUntil;
  const total = votes.bass + votes.chill + votes.hyper;
  const need = playerCount <= 1 ? 1 : 2;
  const secondsLeft = live
    ? Math.max(0, Math.ceil((djModeUntil - now) / 1000))
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: "max(100px, calc(88px + env(safe-area-inset-top)))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 24px))",
        maxHeight: "min(42dvh, 320px)",
        overflowY: "auto",
        background: "rgba(12, 8, 24, 0.94)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(244, 114, 182, 0.45)",
        borderRadius: 16,
        padding: "14px 16px",
        zIndex: 55,
        boxShadow: "0 0 28px rgba(236, 72, 153, 0.25)",
        color: "#e2e8f0",
        pointerEvents: "auto",
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.6 }}>
          🎧 DJ REQUEST QUEUE
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
          {live ? `${djMode.toUpperCase()} · ${secondsLeft}s` : `${total}/${need} votes`}
        </span>
      </div>

      {!live ? (
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            lineHeight: 1.45,
            color: "#cbd5e1",
          }}
        >
          Tap a style to cast <strong style={{ color: "#fff" }}>your 1 vote</strong>
          {playerCount <= 1
            ? " — alone here, one tap starts the drop."
            : " — when 2 people agree on a style, that drop plays for everyone."}
          {myVote ? (
            <>
              {" "}
              Your vote:{" "}
              <strong style={{ color: "#f9a8d4" }}>{myVote.toUpperCase()}</strong>
              {" "}(tap another to switch).
            </>
          ) : null}
        </p>
      ) : null}

      {live ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background:
              "linear-gradient(90deg, rgba(244,114,182,0.2), rgba(139,92,246,0.2))",
            border: "1px solid rgba(244,114,182,0.4)",
            fontWeight: 700,
            fontSize: 13,
            textAlign: "center",
            color: "#f9a8d4",
          }}
        >
          {djMode === "bass" && "🔊 Bass Drop is shaking the floor"}
          {djMode === "chill" && "🌊 Chill Wave rolling through the club"}
          {djMode === "hyper" && "⚡ Hyper Mode — lights going wild"}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {STYLES.map((style) => {
            const count = votes[style.id];
            const selected = myVote === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onVote(style.id);
                }}
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "12px 8px",
                  borderRadius: 12,
                  border: selected
                    ? `2px solid ${style.color}`
                    : `1px solid ${style.color}55`,
                  background: selected
                    ? `${style.color}22`
                    : "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow: selected ? `0 0 16px ${style.color}55` : "none",
                }}
              >
                <span style={{ fontSize: 22 }}>{style.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  {style.label}
                </span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                  {selected ? "YOUR VOTE" : style.hint}
                </span>
                <span
                  style={{
                    marginTop: 2,
                    fontSize: 18,
                    fontWeight: 800,
                    color: style.color,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
