"use client";

import { useEffect, useState } from "react";
import { CONCERT_ZONES } from "@/lib/concertZones";
import { getZoneAction } from "@/lib/clubActivities";
import type { ClubToast, QuestProgress } from "@/hooks/useClubProgress";
import type { ConcertZone } from "@/lib/concertZones";
import type { PulseToken } from "@/lib/clubActivities";

type ClubQuestPanelProps = {
  quests: QuestProgress[];
  completedCount: number;
  collectedCount: number;
  totalTokens: number;
  sessionMinutes: number;
  activeZone: ConcertZone | null;
  nearbyToken: PulseToken | null;
  playerPos: { x: number; z: number };
  toasts: ClubToast[];
  onInteract: () => void;
  onCollect: () => void;
  compact?: boolean;
};

export function ClubQuestPanel({
  quests,
  completedCount,
  collectedCount,
  totalTokens,
  sessionMinutes,
  activeZone,
  nearbyToken,
  playerPos,
  toasts,
  onInteract,
  onCollect,
  compact = false,
}: ClubQuestPanelProps) {
  const [open, setOpen] = useState(false);
  const zoneAction = activeZone ? getZoneAction(activeZone.id) : null;

  // Desktop: open by default once we know we're not on a phone.
  useEffect(() => {
    if (!compact) setOpen(true);
  }, [compact]);

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "absolute",
            top: compact
              ? `max(${56 + index * 36}px, calc(${50 + index * 36}px + env(safe-area-inset-top)))`
              : 88 + index * 44,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 120,
            padding: compact ? "6px 12px" : "10px 18px",
            borderRadius: 999,
            background: "rgba(15, 16, 28, 0.88)",
            border: "1px solid rgba(167, 139, 250, 0.45)",
            color: "#e9d5ff",
            fontSize: compact ? 11 : 13,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            pointerEvents: "none",
            maxWidth: compact ? "78vw" : undefined,
            whiteSpace: compact ? "nowrap" : undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {toast.message}
        </div>
      ))}

      {compact ? (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "max(52px, calc(46px + env(safe-area-inset-top)))",
            zIndex: 55,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(10, 11, 18, 0.82)",
              color: "#c4b5fd",
              fontWeight: 800,
              fontSize: 11,
              cursor: "pointer",
            }}
            aria-label="Club activities"
          >
            {completedCount}/{quests.length}
          </button>
          {open ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 46,
                width: "min(260px, calc(100vw - 24px))",
                maxHeight: "42dvh",
                overflowY: "auto",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(10, 11, 18, 0.94)",
                padding: 10,
                boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, color: "#e2e8f0" }}>
                Activities
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {quests.map((quest) => (
                  <div
                    key={quest.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: quest.done
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontSize: 11,
                      color: "#cbd5e1",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: quest.done ? "#6ee7b7" : "#fff" }}>
                      {quest.done ? "✓ " : ""}
                      {quest.title}
                    </div>
                    <div style={{ marginTop: 2, opacity: 0.75 }}>
                      {quest.current}/{quest.target}
                    </div>
                  </div>
                ))}
              </div>
              {nearbyToken ? (
                <button
                  type="button"
                  onClick={onCollect}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(251,191,36,0.4)",
                    background: "rgba(251,191,36,0.15)",
                    color: "#fde68a",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Collect token
                </button>
              ) : null}
              {zoneAction && activeZone ? (
                <button
                  type="button"
                  onClick={onInteract}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${activeZone.color}66`,
                    background: "rgba(255,255,255,0.05)",
                    color: "#e2e8f0",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {zoneAction.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 120,
          width: "min(300px, calc(100vw - 32px))",
          zIndex: 55,
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: open ? "14px 14px 0 0" : 14,
            border: "1px solid rgba(255,255,255,0.12)",
            borderBottom: open ? "none" : undefined,
            background: "rgba(10, 11, 18, 0.9)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span>Club Activities · {completedCount}/{quests.length}</span>
          <span style={{ color: "#94a3b8" }}>{open ? "−" : "+"}</span>
        </button>

        {open ? (
          <div
            style={{
              background: "rgba(10, 11, 18, 0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderTop: "none",
              borderRadius: "0 0 14px 14px",
              padding: "12px 14px",
              display: "grid",
              gap: 10,
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Time here: {sessionMinutes}m · Tokens {collectedCount}/{totalTokens}
            </div>

            {(zoneAction || nearbyToken) && (
              <div style={{ display: "grid", gap: 6 }}>
                {zoneAction && activeZone ? (
                  <button type="button" onClick={onInteract} style={interactButtonStyle}>
                    <span>G — {zoneAction.label}</span>
                    <span style={{ fontSize: 11, color: "#cbd5e1" }}>{zoneAction.hint}</span>
                  </button>
                ) : null}
                {nearbyToken ? (
                  <button type="button" onClick={onCollect} style={collectButtonStyle}>
                    G — Collect pulse token ✦
                  </button>
                ) : null}
              </div>
            )}

            {quests.map((quest) => {
              const pct = Math.min(100, (quest.current / quest.target) * 100);
              return (
                <div key={quest.id} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: quest.done ? "#86efac" : "#e2e8f0",
                      }}
                    >
                      {quest.done ? "✓ " : ""}
                      {quest.title}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {Math.min(quest.current, quest.target)}/{quest.target}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: quest.done
                          ? "linear-gradient(90deg, #22c55e, #86efac)"
                          : "linear-gradient(90deg, #6366f1, #ec4899)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      )}

      {!compact ? (
      <ClubMinimap
        activeZone={activeZone}
        collectedCount={collectedCount}
        totalTokens={totalTokens}
        playerPos={playerPos}
      />
      ) : null}
    </>
  );
}

function ClubMinimap({
  activeZone,
  collectedCount,
  totalTokens,
  playerPos,
}: {
  activeZone: ConcertZone | null;
  collectedCount: number;
  totalTokens: number;
  playerPos: { x: number; z: number };
}) {
  const mapW = 140;
  const mapH = 108;
  const scaleX = mapW / 52;
  const scaleZ = mapH / 40;

  const toMap = (x: number, z: number) => ({
    left: (x + 26) * scaleX,
    top: (z + 20) * scaleZ,
  });

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 120,
        width: mapW,
        padding: 8,
        borderRadius: 12,
        background: "rgba(10, 11, 18, 0.88)",
        border: "1px solid rgba(255,255,255,0.1)",
        pointerEvents: "none",
        zIndex: 45,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
        CLUB MAP
      </div>
      <div
        style={{
          position: "relative",
          width: mapW,
          height: mapH,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {CONCERT_ZONES.map((zone) => {
          const p = toMap(zone.x, zone.z);
          return (
            <div
              key={zone.id}
              title={zone.label}
              style={{
                position: "absolute",
                left: p.left - 4,
                top: p.top - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: zone.color,
                opacity: activeZone?.id === zone.id ? 1 : 0.55,
                boxShadow: activeZone?.id === zone.id ? `0 0 8px ${zone.color}` : "none",
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: toMap(playerPos.x, playerPos.z).left - 5,
            top: toMap(playerPos.x, playerPos.z).top - 5,
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: "2px solid #67e8f9",
            background: "rgba(103, 232, 254, 0.35)",
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
        Tokens {collectedCount}/{totalTokens} · cyan dot = you
      </div>
    </div>
  );
}

const interactButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(129, 140, 248, 0.45)",
  background: "rgba(99, 102, 241, 0.15)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const collectButtonStyle: React.CSSProperties = {
  ...interactButtonStyle,
  border: "1px solid rgba(167, 139, 250, 0.5)",
  background: "rgba(167, 139, 250, 0.15)",
};
