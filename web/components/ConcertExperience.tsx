"use client";

import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubQuestPanel } from "@/components/ClubQuestPanel";
import { ConcertHUD } from "@/components/ConcertHUD";
import { ClubMusic } from "@/components/ClubMusic";
import { DjVotePanel } from "@/components/DjVotePanel";
import { ChillPanel } from "@/components/ChillPanel";
import { MobileControls } from "@/components/MobileControls";
import { VoicePanel } from "@/components/VoicePanel";
import { useClubProgress } from "@/hooks/useClubProgress";
import { useConcertRoom } from "@/hooks/useConcertRoom";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import type { ConcertZone } from "@/lib/concertZones";
import { VOICE_SEATS, LOUNGE_SEATS, LOUNGE_SEAT_OFFSET, isVoiceSeat, isLoungeSeat } from "@/lib/clubLayout";
import { isCoarsePointer } from "@/lib/mobileInput";
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
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [mouseLookActive, setMouseLookActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  /** Optimistic seat index so G-to-sit isn't undone by in-flight move packets. */
  const [pendingSeat, setPendingSeat] = useState<number | null>(null);
  const [photoBurst, setPhotoBurst] = useState(0);

  useEffect(() => {
    const sync = () => setIsMobile(isCoarsePointer());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

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
    pushClubToast,
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
  const localSeat = localSnapshot?.seat ?? -1;
  const effectiveSeat = localSeat >= 0 ? localSeat : (pendingSeat ?? -1);
  const localVoiceSeated = isVoiceSeat(effectiveSeat);
  const localLoungeSeated = isLoungeSeat(effectiveSeat);
  const seatedPlayers = useMemo(
    () => players.filter((p) => isVoiceSeat(p.seat)),
    [players],
  );

  useEffect(() => {
    if (localSeat >= 0) setPendingSeat(null);
  }, [localSeat]);

  useEffect(() => {
    if (pendingSeat === null) return;
    const timer = window.setTimeout(() => setPendingSeat(null), 2500);
    return () => window.clearTimeout(timer);
  }, [pendingSeat]);

  // Full-screen shutter for remote photos (local already flashes on G press).
  useEffect(() => {
    if (photoFlashes.length === 0) return;
    const latest = photoFlashes[photoFlashes.length - 1];
    if (latest.sessionId === sessionId) return;
    setPhotoBurst((n) => n + 1);
  }, [photoFlashes, sessionId]);
  const voicePeerIds = useMemo(
    () =>
      seatedPlayers
        .filter((p) => p.sessionId !== sessionId)
        .map((p) => p.sessionId),
    [seatedPlayers, sessionId],
  );

  const voice = useVoiceChat({
    active: localVoiceSeated,
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
      if (localVoiceSeated) {
        setPendingSeat(null);
        sendStand();
        return;
      }
      if (localLoungeSeated) {
        setPendingSeat(null);
        sendStand();
      }
      const occupied = new Set(seatedPlayers.map((p) => p.seat));
      const freeSeat = VOICE_SEATS.findIndex((_, index) => !occupied.has(index));
      if (freeSeat >= 0) {
        setPendingSeat(freeSeat);
        sendSit(freeSeat);
        pushClubToast("Sat down in the Voice Lounge — mic is live");
      } else {
        pushClubToast("All voice seats are taken");
      }
      return;
    }

    // Chill Lounge — sit on the couch and sip a drink.
    if (activeZone?.id === "lounge") {
      if (localLoungeSeated) {
        setPendingSeat(null);
        sendStand();
        pushClubToast("Stood up from the couch");
        return;
      }
      if (localVoiceSeated) {
        setPendingSeat(null);
        sendStand();
      }
      const occupied = new Set(
        players.filter((p) => isLoungeSeat(p.seat)).map((p) => p.seat),
      );
      const freeIndex = LOUNGE_SEATS.findIndex(
        (_, index) => !occupied.has(LOUNGE_SEAT_OFFSET + index),
      );
      if (freeIndex >= 0) {
        const seatIndex = LOUNGE_SEAT_OFFSET + freeIndex;
        setPendingSeat(seatIndex);
        sendSit(seatIndex);
        pushClubToast("Chilling on the couch — sip and relax 🍹");
        const result = progress.interactZone(activeZone);
        if (result) handleChat(result.chatMessage);
      } else {
        pushClubToast("Couch is full — wait for a free seat");
      }
      return;
    }

    // Photo wall — flash + pose broadcast to the whole club.
    if (activeZone?.id === "photo") {
      setPhotoBurst((n) => n + 1);
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
    localLoungeSeated,
    localVoiceSeated,
    players,
    progress,
    pushClubToast,
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
      className={isMobile ? "concert-shell concert-shell--mobile" : "concert-shell"}
      style={{
        width: "100vw",
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
      }}
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
        pendingSeat={pendingSeat}
        onMove={(payload) => {
          if (pendingSeat !== null && payload.anim === "walk") {
            setPendingSeat(null);
          }
          sendMove(payload);
        }}
        onEmote={handleEmote}
        onZoneChange={handleZoneChange}
        onMouseLookChange={setMouseLookActive}
        collectedTokenIds={progress.collectedTokens}
        glowBuffActive={progress.glowBuffActive}
        onPositionUpdate={progress.updatePlayerPosition}
        onInteract={handleInteract}
        onSit={(seatIndex) => {
          setPendingSeat(seatIndex);
          sendSit(seatIndex);
        }}
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

      {/* Full-viewport camera shutter when a photo fires */}
      {photoBurst > 0 ? (
        <div
          key={photoBurst}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 80,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.95) 0%, rgba(255,240,250,0.55) 35%, rgba(255,255,255,0) 70%)",
            animation: "photoShutter 0.55s ease-out forwards",
          }}
        />
      ) : null}

      {/* Club-wide activity toasts (sync / photo / DJ drop) */}
      <div
        style={{
          position: "absolute",
          top: isMobile
            ? "max(52px, calc(46px + env(safe-area-inset-top)))"
            : 90,
          left: "50%",
          transform: "translateX(-50%)",
          display: "grid",
          gap: 6,
          zIndex: 70,
          pointerEvents: "none",
          width: isMobile
            ? "min(280px, calc(100vw - 24px))"
            : "min(360px, calc(100vw - 32px))",
        }}
      >
        {clubToasts.slice(0, isMobile ? 2 : 5).map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: isMobile ? "7px 12px" : "10px 16px",
              borderRadius: 12,
              background: "rgba(10, 11, 18, 0.88)",
              border: "1px solid rgba(167, 139, 250, 0.45)",
              color: "#e9d5ff",
              fontWeight: 700,
              fontSize: isMobile ? 11 : 13,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <MobileControls
        visible={isMobile && !showHelp}
        onInteract={handleInteract}
        onDance={() => handleEmote("dance")}
      />

      <ChillPanel
        seated={localLoungeSeated}
        mobile={isMobile}
        onStand={() => {
          setPendingSeat(null);
          sendStand();
          pushClubToast("Stood up from the couch");
        }}
      />

      <VoicePanel
        seated={localVoiceSeated}
        mobile={isMobile}
        micReady={voice.micReady}
        micError={voice.micError}
        muted={voice.muted}
        onToggleMute={voice.toggleMute}
        onStand={() => {
          setPendingSeat(null);
          sendStand();
        }}
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
            padding: 16,
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              padding: isMobile ? "22px 18px" : "28px 32px",
              borderRadius: 20,
              background: "rgba(15, 16, 28, 0.95)",
              border: "1px solid rgba(129, 140, 248, 0.45)",
              boxShadow: "0 0 40px rgba(99, 102, 241, 0.25)",
              textAlign: "center",
              color: "#e2e8f0",
              maxHeight: "min(90dvh, 640px)",
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
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
              {isMobile ? (
                <>
                  <div><strong style={{ color: "#67e8f9" }}>Left stick</strong> — move around</div>
                  <div><strong style={{ color: "#f472b6" }}>Right pad</strong> — look / turn</div>
                  <div><strong style={{ color: "#fbbf24" }}>Interact</strong> — sit, photo, zone actions</div>
                  <div><strong style={{ color: "#fde68a" }}>Sprint</strong> — toggle faster run</div>
                  <div><strong style={{ color: "#a78bfa" }}>Activities</strong> — quests (tap to expand)</div>
                </>
              ) : (
                <>
                  <div><strong style={{ color: "#67e8f9" }}>W A S D</strong> — explore the club</div>
                  <div><strong style={{ color: "#fde68a" }}>Shift</strong> — sprint while moving</div>
                  <div><strong style={{ color: "#fbbf24" }}>G</strong> — interact in a zone or collect tokens</div>
                  <div><strong style={{ color: "#a78bfa" }}>Quests</strong> — track goals in Club Activities (bottom-right)</div>
                  <div><strong style={{ color: "#f472b6" }}>Space / E / F / R</strong> — dance, wave, cheer, pose</div>
                </>
              )}
              <div><strong style={{ color: "#818cf8" }}>Dance floor</strong> — dance together for Synced!</div>
              <div><strong style={{ color: "#fb7185" }}>Photo wall</strong> — Interact to snap a flash photo</div>
              <div><strong style={{ color: "#f472b6" }}>DJ booth</strong> — vote Bass / Chill / Hyper</div>
              <div><strong style={{ color: "#34d399" }}>Voice Lounge</strong> — sit to talk live</div>
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
              {isMobile ? "Tap to Enter Club" : "Click to Enter Club"}
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
        compact={isMobile}
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
        compact={isMobile}
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
