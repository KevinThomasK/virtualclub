"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Client, Room } from "colyseus.js";
import type { MapSchema } from "@colyseus/schema";
import type { AvatarOutfit } from "@/lib/avatarCatalog";
import type { ConcertZone } from "@/lib/concertZones";
import type { AnimState, EmoteType, PlayerSnapshot } from "@/lib/types";

type RoomPlayer = {
  userId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: AnimState;
  color: string;
  chat: string;
  shirt: string;
  pants: string;
  shoes: string;
  style: string;
  gender: string;
  seat: number;
};

type ConcertRoomState = {
  players: MapSchema<RoomPlayer>;
  dropUntil: number;
  energy: number;
  partyUntil: number;
};

export type ReactionEvent = {
  id: string;
  emoji: string;
  name: string;
};

type JoinOptions = {
  userId: string;
  name: string;
} & AvatarOutfit;

function toSnapshot(sessionId: string, player: RoomPlayer): PlayerSnapshot {
  return {
    sessionId,
    userId: player.userId,
    name: player.name,
    x: player.x,
    y: player.y,
    z: player.z,
    rotY: player.rotY,
    anim: player.anim,
    color: player.color,
    chat: player.chat,
    shirt: player.shirt,
    pants: player.pants,
    shoes: player.shoes,
    style: player.style,
    gender: player.gender ?? "male",
    seat: player.seat ?? -1,
  };
}

export type VoiceSignalHandler = (from: string, data: unknown) => void;

/**
 * Live position/rotation per player, mutated in place on every server patch.
 * The 3D loop reads these directly each frame, so high-frequency movement
 * never triggers React re-renders.
 */
export type LiveTarget = { x: number; y: number; z: number; rotY: number };

/** True when everything EXCEPT position/rotation is unchanged. */
function sameStructure(a: PlayerSnapshot[], b: PlayerSnapshot[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const p = a[i];
    const q = b[i];
    if (
      p.sessionId !== q.sessionId ||
      p.userId !== q.userId ||
      p.name !== q.name ||
      p.anim !== q.anim ||
      p.chat !== q.chat ||
      p.seat !== q.seat ||
      p.color !== q.color ||
      p.shirt !== q.shirt ||
      p.pants !== q.pants ||
      p.shoes !== q.shoes ||
      p.style !== q.style ||
      p.gender !== q.gender
    ) {
      return false;
    }
  }
  return true;
}

export function useConcertRoom(options: JoinOptions | null) {
  const roomRef = useRef<Room<ConcertRoomState> | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSnapshot[]>([]);
  const [dropUntil, setDropUntil] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [partyUntil, setPartyUntil] = useState(0);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const voiceHandlerRef = useRef<VoiceSignalHandler | null>(null);
  const liveTargetsRef = useRef<Map<string, LiveTarget>>(new Map());
  const snapshotRef = useRef<PlayerSnapshot[]>([]);

  useEffect(() => {
    if (!options) {
      return;
    }

    let cancelled = false;
    const endpoint =
      process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
    const client = new Client(endpoint);

    client
      .joinOrCreate<ConcertRoomState>("concert", options)
      .then((room) => {
        if (cancelled) {
          room.leave();
          return;
        }

        roomRef.current = room;
        setSessionId(room.sessionId);
        setConnected(true);
        setError(null);
        setDropUntil(room.state.dropUntil);
        setEnergy(room.state.energy ?? 0);
        setPartyUntil(room.state.partyUntil ?? 0);

        room.onMessage(
          "reaction",
          (payload: { emoji: string; name: string; sessionId: string }) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setReactions((current) => [
              ...current.slice(-11),
              { id, emoji: payload.emoji, name: payload.name },
            ]);
            window.setTimeout(() => {
              setReactions((current) =>
                current.filter((entry) => entry.id !== id),
              );
            }, 3200);
          },
        );

        room.onMessage(
          "voice",
          (payload: { from: string; data: unknown }) => {
            voiceHandlerRef.current?.(payload.from, payload.data);
          },
        );

        // Server patches arrive ~20x/sec. Positions are streamed into mutable
        // targets read by the render loop; React state only updates when the
        // roster or a low-frequency field (anim/chat/seat/...) changes.
        const syncFromState = () => {
          const targets = liveTargetsRef.current;
          const next: PlayerSnapshot[] = [];
          const seen = new Set<string>();

          room.state.players.forEach((player, id) => {
            seen.add(id);
            const target = targets.get(id);
            if (target) {
              target.x = player.x;
              target.y = player.y;
              target.z = player.z;
              target.rotY = player.rotY;
            } else {
              targets.set(id, {
                x: player.x,
                y: player.y,
                z: player.z,
                rotY: player.rotY,
              });
            }
            next.push(toSnapshot(id, player));
          });

          if (targets.size !== seen.size) {
            for (const id of Array.from(targets.keys())) {
              if (!seen.has(id)) targets.delete(id);
            }
          }

          if (!sameStructure(snapshotRef.current, next)) {
            snapshotRef.current = next;
            setPlayers(next);
          }

          // These bail out in React when the value is unchanged.
          setDropUntil(room.state.dropUntil);
          setEnergy(room.state.energy ?? 0);
          setPartyUntil(room.state.partyUntil ?? 0);
        };

        syncFromState();
        room.onStateChange(syncFromState);
      })
      .catch((joinError: Error) => {
        if (!cancelled) {
          setConnected(false);
          setError(joinError.message);
        }
      });

    return () => {
      cancelled = true;
      roomRef.current?.leave();
      roomRef.current = null;
      setConnected(false);
      setSessionId(null);
      setPlayers([]);
      setDropUntil(0);
      setEnergy(0);
      setPartyUntil(0);
      setReactions([]);
      liveTargetsRef.current.clear();
      snapshotRef.current = [];
    };
  }, [
    options?.userId,
    options?.name,
    options?.gender,
    options?.color,
    options?.shirt,
    options?.pants,
    options?.shoes,
    options?.style,
  ]);

  const sendMove = useCallback(
    (payload: {
      x: number;
      y: number;
      z: number;
      rotY: number;
      anim: "idle" | "walk";
    }) => {
      roomRef.current?.send("move", {
        type: "move",
        ...payload,
      });
    },
    [],
  );

  const sendEmote = useCallback((emote: EmoteType) => {
    roomRef.current?.send("emote", { type: "emote", emote });
  }, []);

  const sendChat = useCallback((text: string) => {
    roomRef.current?.send("chat", { type: "chat", text });
  }, []);

  const sendHype = useCallback(() => {
    roomRef.current?.send("hype", { type: "hype" });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    roomRef.current?.send("reaction", { type: "reaction", emoji });
  }, []);

  const sendSit = useCallback((seatIndex: number) => {
    roomRef.current?.send("sit", { type: "sit", seatIndex });
  }, []);

  const sendStand = useCallback(() => {
    roomRef.current?.send("stand", { type: "stand" });
  }, []);

  const sendVoiceSignal = useCallback((to: string, data: unknown) => {
    roomRef.current?.send("voice", { type: "voice", to, data });
  }, []);

  const setVoiceSignalHandler = useCallback(
    (handler: VoiceSignalHandler | null) => {
      voiceHandlerRef.current = handler;
    },
    [],
  );

  return {
    connected,
    sessionId,
    players,
    liveTargets: liveTargetsRef.current,
    dropUntil,
    energy,
    partyUntil,
    reactions,
    error,
    sendMove,
    sendEmote,
    sendChat,
    sendHype,
    sendReaction,
    sendSit,
    sendStand,
    sendVoiceSignal,
    setVoiceSignalHandler,
  };
}

export type { ConcertZone };
