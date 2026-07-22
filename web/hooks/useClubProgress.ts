"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CLUB_QUESTS,
  PULSE_TOKENS,
  TOKEN_PICKUP_RADIUS,
  getZoneAction,
  type ClubQuest,
  type PulseToken,
} from "@/lib/clubActivities";
import type { ConcertZone } from "@/lib/concertZones";
import type { EmoteType } from "@/lib/types";

export type ClubToast = {
  id: string;
  message: string;
};

export type QuestProgress = ClubQuest & {
  current: number;
  done: boolean;
};

export type ZoneInteractResult = {
  chatMessage: string;
  emote?: EmoteType;
  glowSeconds?: number;
};

export function useClubProgress() {
  const [visitedZones, setVisitedZones] = useState<Set<string>>(new Set());
  const [collectedTokens, setCollectedTokens] = useState<Set<string>>(new Set());
  const [emoteCount, setEmoteCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [hypeCount, setHypeCount] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ClubToast[]>([]);
  const [glowBuffUntil, setGlowBuffUntil] = useState(0);
  const [sessionStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 6 });
  const [nearbyToken, setNearbyToken] = useState<PulseToken | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const addToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current.slice(-4), { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const completeQuestIfReady = useCallback(
    (quest: ClubQuest, current: number) => {
      if (completedQuests.has(quest.id)) return;
      if (current < quest.target) return;
      setCompletedQuests((prev) => new Set(prev).add(quest.id));
      addToast(`Quest complete: ${quest.title} — ${quest.reward}`);
    },
    [addToast, completedQuests],
  );

  const metrics = useMemo(
    () => ({
      zones: visitedZones.size,
      tokens: collectedTokens.size,
      emotes: emoteCount,
      chats: chatCount,
      hype: hypeCount,
      interactions: interactionCount,
    }),
    [
      visitedZones.size,
      collectedTokens.size,
      emoteCount,
      chatCount,
      hypeCount,
      interactionCount,
    ],
  );

  const quests: QuestProgress[] = useMemo(
    () =>
      CLUB_QUESTS.map((quest) => ({
        ...quest,
        current: metrics[quest.metric],
        done: completedQuests.has(quest.id),
      })),
    [completedQuests, metrics],
  );

  const completedCount = quests.filter((q) => q.done).length;

  const visitZone = useCallback(
    (zone: ConcertZone | null) => {
      if (!zone || visitedZones.has(zone.id)) return;
      setVisitedZones((prev) => {
        const next = new Set(prev);
        next.add(zone.id);
        completeQuestIfReady(
          CLUB_QUESTS.find((q) => q.id === "explorer")!,
          next.size,
        );
        return next;
      });
      addToast(`Discovered: ${zone.label}`);
    },
    [addToast, completeQuestIfReady, visitedZones],
  );

  const collectToken = useCallback(
    (tokenId: string) => {
      if (collectedTokens.has(tokenId)) return false;
      const token = PULSE_TOKENS.find((entry) => entry.id === tokenId);
      setCollectedTokens((prev) => {
        const next = new Set(prev);
        next.add(tokenId);
        completeQuestIfReady(
          CLUB_QUESTS.find((q) => q.id === "collector")!,
          next.size,
        );
        return next;
      });
      addToast(`Pulse token found${token ? `: ${token.label}` : ""} ✦`);
      setNearbyToken(null);
      return true;
    },
    [addToast, collectedTokens, completeQuestIfReady],
  );

  const recordEmote = useCallback(() => {
    setEmoteCount((count) => {
      const next = count + 1;
      completeQuestIfReady(CLUB_QUESTS.find((q) => q.id === "dancer")!, next);
      return next;
    });
  }, [completeQuestIfReady]);

  const recordChat = useCallback(() => {
    setChatCount((count) => {
      const next = count + 1;
      completeQuestIfReady(CLUB_QUESTS.find((q) => q.id === "social")!, next);
      return next;
    });
  }, [completeQuestIfReady]);

  const recordHype = useCallback(() => {
    setHypeCount((count) => {
      const next = count + 1;
      completeQuestIfReady(CLUB_QUESTS.find((q) => q.id === "party")!, next);
      return next;
    });
  }, [completeQuestIfReady]);

  const interactZone = useCallback(
    (zone: ConcertZone | null): ZoneInteractResult | null => {
      if (!zone) return null;
      const action = getZoneAction(zone.id);
      if (!action) return null;

      setInteractionCount((count) => {
        const next = count + 1;
        completeQuestIfReady(CLUB_QUESTS.find((q) => q.id === "regular")!, next);
        return next;
      });

      if (action.glowSeconds) {
        setGlowBuffUntil(Date.now() + action.glowSeconds * 1000);
        addToast(`Neon drink — glowing for ${action.glowSeconds}s`);
      }

      return {
        chatMessage: action.chatMessage,
        emote: action.emote,
        glowSeconds: action.glowSeconds,
      };
    },
    [addToast, completeQuestIfReady],
  );

  // Called from the 3D render loop every frame — throttle so it doesn't
  // re-render the whole React tree at 60fps.
  const lastPosCheckRef = useRef(0);
  const updatePlayerPosition = useCallback(
    (x: number, z: number) => {
      const nowMs = performance.now();
      if (nowMs - lastPosCheckRef.current < 200) return;
      lastPosCheckRef.current = nowMs;

      setPlayerPos((prev) =>
        Math.abs(prev.x - x) < 0.05 && Math.abs(prev.z - z) < 0.05
          ? prev
          : { x, z },
      );

      if (collectedTokens.size >= PULSE_TOKENS.length) {
        setNearbyToken(null);
        return;
      }
      let closest: PulseToken | null = null;
      let closestDist = TOKEN_PICKUP_RADIUS;
      for (const token of PULSE_TOKENS) {
        if (collectedTokens.has(token.id)) continue;
        const dx = x - token.x;
        const dz = z - token.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          closest = token;
        }
      }
      // PULSE_TOKENS entries are stable references, so React bails out
      // when the nearest token hasn't changed.
      setNearbyToken(closest);
    },
    [collectedTokens],
  );

  const tryCollectNearby = useCallback(() => {
    if (!nearbyToken) return false;
    return collectToken(nearbyToken.id);
  }, [collectToken, nearbyToken]);

  const sessionMinutes = Math.floor((now - sessionStart) / 60000);
  const glowBuffActive = glowBuffUntil > now;

  return {
    quests,
    completedCount,
    collectedTokens,
    collectedCount: collectedTokens.size,
    totalTokens: PULSE_TOKENS.length,
    visitedZones,
    toasts,
    glowBuffUntil,
    glowBuffActive,
    nearbyToken,
    playerPos,
    sessionMinutes,
    visitZone,
    collectToken,
    recordEmote,
    recordChat,
    recordHype,
    interactZone,
    updatePlayerPosition,
    tryCollectNearby,
  };
}
