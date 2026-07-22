"use client";

import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubQuestPanel } from "@/components/ClubQuestPanel";
import { ConcertHUD } from "@/components/ConcertHUD";
import { ClubMusic } from "@/components/ClubMusic";
import { DjVotePanel } from "@/components/DjVotePanel";
import { VoicePanel } from "@/components/VoicePanel";
import { useClubProgress } from "@/hooks/useClubProgress";
import { useConcertRoom } from "@/hooks/useConcertRoom";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import type { ConcertZone } from "@/lib/concertZones";
import { VOICE_SEATS } from "@/lib/clubLayout";
import type { EmoteType } from "@/lib/types";

const ConcertScene = dynamic(
  () =>
    import("@/components/ConcertScene").then((module) => module.ConcertScene),
  { ssr: false },
);

export function ConcertExperience() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const ready = status === "authenticated" && !!user;
  const [activeZone, setActiveZone] = useState<ConcertZone | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [mouseLookActive, setMouseLookActive] = useState(false);

  const progress = useClubProgress();

  useEffect(() => {
    const dismiss = () => setShowHelp(false);
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);

  const {
    connected,
    sessionId,
    players,
    liveTargets,
    dropUntil,
    energy,
    partyUntil,
    djMode,
    djModeUntil,
    djVotes,
    myDjVote,
    reactions,
    photoFlashes,
    clubToasts,
    error,
    sendMove,
    sendEmote,
    sendChat,
    sendHype,
    sendReaction,
    sendSit,
    sendStand,
    sendPhoto,
    sendDjVote,
    sendVoiceSignal,
    setVoiceSignalHandler,
  } = useConcertRoom(
    ready
      ? {
          userId: user.id,
          name: user.name,
          gender: user.gender,
          color: user.color,
          shirt: user.shirt,
          pants: user.pants,
          shoes: user.shoes,
          style: user.style,
        }
      : null,
  );

  // --- Voice lounge (Clubhouse-style) ---
  const localSnapshot = players.find((p) => p.sessionId === sessionId);
  const localSeated = (localSnapshot?.seat ?? -1) >= 0;
  const seatedPlayers = useMemo(
    () => players.filter((p) => p.seat >= 0),
    [players],
  );
  const voicePeerIds = useMemo(
    () =>
      seatedPlayers
        .filter((p) => p.sessionId !== sessionId)
        .map((p) => p.sessionId),
    [seatedPlayers, sessionId],
  );

  const voice = useVoiceChat({
    active: localSeated,
    localSessionId: sessionId,
    peerIds: voicePeerIds,
    sendSignal: sendVoiceSignal,
    setSignalHandler: setVoiceSignalHandler,
  });

  const handleZoneChange = useCallback(
    (zone: ConcertZone | null) => {
      setActiveZone(zone);
      progress.visitZone(zone);
    },
    [progress],
  );

  const handleEmote = useCallback(
    (emote: EmoteType) => {
      progress.recordEmote();
      sendEmote(emote);
    },
    [progress, sendEmote],
  );

  const handleChat = useCallback(
    (text: string) => {
      progress.recordChat();
      sendChat(text);
    },
    [progress, sendChat],
  );

  const handleHype = useCallback(() => {
    progress.recordHype();
    sendHype();
  }, [progress, sendHype]);

  const handleInteract = useCallback(() => {
    // In the Voice Lounge, G toggles sitting (and with it, live voice chat).
    if (activeZone?.id === "voice") {
      if (localSeated) {
        sendStand();
        return;
      }
      const occupied = new Set(seatedPlayers.map((p) => p.seat));
      const freeSeat = VOICE_SEATS.findIndex((_, index) => !occupied.has(index));
      if (freeSeat >= 0) {
        sendSit(freeSeat);
      }
      return;
    }

    // Photo wall — flash + pose broadcast to the whole club.
    if (activeZone?.id === "photo") {
      sendPhoto();
      progress.interactZone(activeZone);
      return;
    }

    // DJ booth — voting UI handles G; still record an interaction toast.
    if (activeZone?.id === "dj") {
      progress.interactZone(activeZone);
      return;
    }

    if (progress.tryCollectNearby()) return;

    const result = progress.interactZone(activeZone);
    if (!result) return;

    handleChat(result.chatMessage);
    if (result.emote) {
      handleEmote(result.emote);
    }
  }, [
    activeZone,
    handleChat,
    handleEmote,
    localSeated,
    progress,
    seatedPlayers,
    sendPhoto,
    sendSit,
    sendStand,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      if (event.code === "KeyH") {
        event.preventDefault();
        handleHype();
      }
      if (event.code === "Digit1") handleChat("Let's go!");
      if (event.code === "Digit2") handleChat("This is fire!");
      if (event.code === "Digit3") handleChat("Amazing set!");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleChat, handleHype]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#cbd5e1",
        }}
      >
        Loading session...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const localOutfit = {
    gender: user.gender,
    color: user.color,
    shirt: user.shirt,
    pants: user.pants,
    shoes: user.shoes,
    style: user.style,
  };

  const dropActive = dropUntil > Date.now();
  const partyActive = partyUntil > Date.now();
  const djLive = Boolean(djMode) && Date.now() < djModeUntil;

  return (
    <div
      style={{ width: "100vw", height: "100vh", position: "relative" }}
      onPointerDown={() => setShowHelp(false)}
    >
      <ClubMusic
        enabled={musicEnabled}
        boost={dropActive || partyActive || djMode === "bass" || djMode === "hyper"}
        mode={djLive ? djMode : ""}
      />

      <ConcertScene
        sessionId={sessionId}
        localName={user.name}
        localOutfit={localOutfit}
        players={players}
        liveTargets={liveTargets}
        dropUntil={dropUntil}
        partyUntil={partyUntil}
        djMode={djLive ? djMode : ""}
        photoFlashes={photoFlashes}
        onMove={sendMove}
        onEmote={handleEmote}
        onZoneChange={handleZoneChange}
        onMouseLookChange={setMouseLookActive}
        collectedTokenIds={progress.collectedTokens}
        glowBuffActive={progress.glowBuffActive}
        onPositionUpdate={progress.updatePlayerPosition}
        onInteract={handleInteract}
        onSit={sendSit}
        speakingIds={voice.speakingIds}
      />

      <DjVotePanel
        visible={activeZone?.id === "dj"}
        votes={djVotes}
        myVote={myDjVote}
        playerCount={players.length}
        djMode={djMode}
        djModeUntil={djModeUntil}
        onVote={sendDjVote}
      />

      {/* Club-wide activity toasts (sync / photo / DJ drop) */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: "50%",
          transform: "translateX(-50%)",
          display: "grid",
          gap: 8,
          zIndex: 70,
          pointerEvents: "none",
          width: "min(360px, calc(100vw - 32px))",
        }}
      >
        {clubToasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              background: "rgba(10, 11, 18, 0.92)",
              border: "1px solid rgba(167, 139, 250, 0.45)",
              color: "#e9d5ff",
              fontWeight: 700,
              fontSize: 13,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <VoicePanel
        seated={localSeated}
        micReady={voice.micReady}
        micError={voice.micError}
        muted={voice.muted}
        onToggleMute={voice.toggleMute}
        onStand={sendStand}
        localSessionId={sessionId}
        participants={seatedPlayers}
        speakingIds={voice.speakingIds}
        connectedIds={voice.connectedIds}
      />

      {showHelp ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 100,
            pointerEvents: "auto",
            cursor: "pointer",
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              maxWidth: 440,
              padding: "28px 32px",
              borderRadius: 20,
              background: "rgba(15, 16, 28, 0.95)",
              border: "1px solid rgba(129, 140, 248, 0.45)",
              boxShadow: "0 0 40px rgba(99, 102, 241, 0.25)",
              textAlign: "center",
              color: "#e2e8f0",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Welcome to Pulse Club
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.6, color: "#cbd5e1" }}>
              Explore six zones, complete club quests, and hunt for hidden pulse tokens.
            </p>
            <div
              style={{
                display: "grid",
                gap: 8,
                fontSize: 13,
                textAlign: "left",
                background: "rgba(255,255,255,0.04)",
                padding: "12px 16px",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <div><strong style={{ color: "#67e8f9" }}>W A S D</strong> — explore the club</div>
              <div><strong style={{ color: "#fbbf24" }}>G</strong> — interact in a zone or collect tokens</div>
              <div><strong style={{ color: "#a78bfa" }}>Quests</strong> — track goals in Club Activities (bottom-right)</div>
              <div><strong style={{ color: "#f472b6" }}>Space / E / F / R</strong> — dance, wave, cheer, pose</div>
              <div><strong style={{ color: "#818cf8" }}>Dance floor</strong> — dance together within 1s for Synced!</div>
              <div><strong style={{ color: "#fb7185" }}>Photo wall</strong> — press G to snap a flash photo</div>
              <div><strong style={{ color: "#f472b6" }}>DJ booth</strong> — vote Bass / Chill / Hyper</div>
              <div><strong style={{ color: "#34d399" }}>Voice Lounge</strong> — walk to the green circle, press <strong>G</strong> (or click a stool) to sit &amp; talk live</div>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "10px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Click to Enter Club
            </div>
          </div>
        </div>
      ) : null}

      <ClubQuestPanel
        quests={progress.quests}
        completedCount={progress.completedCount}
        collectedCount={progress.collectedCount}
        totalTokens={progress.totalTokens}
        sessionMinutes={progress.sessionMinutes}
        activeZone={activeZone}
        nearbyToken={progress.nearbyToken}
        playerPos={progress.playerPos}
        toasts={progress.toasts}
        onInteract={handleInteract}
        onCollect={handleInteract}
      />

      <ConcertHUD
        connected={connected}
        playerCount={players.length}
        activeZone={activeZone}
        dropUntil={dropUntil}
        energy={energy}
        partyUntil={partyUntil}
        reactions={reactions}
        onReaction={sendReaction}
        musicEnabled={musicEnabled}
        onToggleMusic={() => setMusicEnabled((value) => !value)}
        mouseLookActive={mouseLookActive}
        onEmote={handleEmote}
        onChat={handleChat}
        onHype={handleHype}
        onLeave={() => signOut({ callbackUrl: "/" })}
        onInteract={handleInteract}
      />

      {error ? (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(127,29,29,0.9)",
            color: "#fecaca",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 200,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
