"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceSignalHandler } from "@/hooks/useConcertRoom";

type VoiceSignalData =
  | { sdp: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

type UseVoiceChatOptions = {
  /** True while the local player is seated in the voice lounge. */
  active: boolean;
  localSessionId: string | null;
  /** Session ids of the OTHER seated players we should be connected to. */
  peerIds: string[];
  sendSignal: (to: string, data: unknown) => void;
  setSignalHandler: (handler: VoiceSignalHandler | null) => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const SPEAKING_THRESHOLD = 0.03;

type PeerEntry = {
  connection: RTCPeerConnection;
  audio: HTMLAudioElement | null;
  analyser: AnalyserNode | null;
  pendingCandidates: RTCIceCandidateInit[];
};

/**
 * Clubhouse-style voice chat: a full-mesh of WebRTC audio connections between
 * everyone seated in the lounge. Signaling (SDP/ICE) is relayed through the
 * Colyseus room, so no extra media server is needed.
 */
export function useVoiceChat({
  active,
  localSessionId,
  peerIds,
  sendSignal,
  setSignalHandler,
}: UseVoiceChatOptions) {
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const mutedRef = useRef(false);
  const sendSignalRef = useRef(sendSignal);
  sendSignalRef.current = sendSignal;

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;
    entry.connection.onicecandidate = null;
    entry.connection.ontrack = null;
    entry.connection.onnegotiationneeded = null;
    entry.connection.close();
    if (entry.audio) {
      entry.audio.srcObject = null;
      entry.audio.remove();
    }
    peersRef.current.delete(peerId);
    setConnectedIds((current) => {
      if (!current.has(peerId)) return current;
      const next = new Set(current);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeer = useCallback(
    (peerId: string, isInitiator: boolean): PeerEntry => {
      const connection = new RTCPeerConnection(RTC_CONFIG);
      const entry: PeerEntry = {
        connection,
        audio: null,
        analyser: null,
        pendingCandidates: [],
      };
      peersRef.current.set(peerId, entry);

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          connection.addTrack(track, stream);
        });
      }

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalRef.current(peerId, {
            candidate: event.candidate.toJSON(),
          });
        }
      };

      connection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        if (!entry.audio) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          audio.setAttribute("playsinline", "true");
          document.body.appendChild(audio);
          entry.audio = audio;
        }
        entry.audio.srcObject = remoteStream;
        void entry.audio.play().catch(() => {
          // Autoplay may be blocked until the user interacts; the click that
          // seated them normally satisfies this already.
        });

        // Per-peer analyser for the "who is talking" indicator.
        try {
          const context = getAudioContext();
          const source = context.createMediaStreamSource(remoteStream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          entry.analyser = analyser;
        } catch {
          entry.analyser = null;
        }

        setConnectedIds((current) => new Set(current).add(peerId));
      };

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === "failed" ||
          connection.connectionState === "closed"
        ) {
          closePeer(peerId);
        }
      };

      if (isInitiator) {
        connection.onnegotiationneeded = async () => {
          try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            sendSignalRef.current(peerId, {
              sdp: connection.localDescription!.toJSON(),
            });
          } catch {
            // Renegotiation failed; connection state handler will clean up.
          }
        };
      }

      return entry;
    },
    [closePeer, getAudioContext],
  );

  // Acquire / release the microphone when sitting down / standing up.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setMicError(null);

    navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !mutedRef.current;
        });

        try {
          const context = getAudioContext();
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          localAnalyserRef.current = analyser;
        } catch {
          localAnalyserRef.current = null;
        }

        setMicReady(true);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMicError(
            error.name === "NotAllowedError"
              ? "Microphone blocked — allow mic access to talk"
              : `Mic unavailable: ${error.message}`,
          );
        }
      });

    return () => {
      cancelled = true;
      peersRef.current.forEach((_entry, peerId) => closePeer(peerId));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      localAnalyserRef.current = null;
      setMicReady(false);
      setSpeakingIds(new Set());
      setConnectedIds(new Set());
    };
  }, [active, closePeer, getAudioContext]);

  // Handle incoming signaling from other seated players.
  useEffect(() => {
    if (!active || !localSessionId) {
      setSignalHandler(null);
      return;
    }

    const handler: VoiceSignalHandler = async (from, rawData) => {
      const data = rawData as VoiceSignalData;
      let entry = peersRef.current.get(from);

      if ("sdp" in data) {
        if (data.sdp.type === "offer") {
          // Callee side: create the connection on demand.
          if (!entry) {
            entry = createPeer(from, false);
          }
          const { connection } = entry;
          await connection.setRemoteDescription(data.sdp);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          sendSignalRef.current(from, {
            sdp: connection.localDescription!.toJSON(),
          });
        } else if (entry) {
          await entry.connection.setRemoteDescription(data.sdp);
        }

        // Flush ICE candidates that arrived before the remote description.
        if (entry) {
          for (const candidate of entry.pendingCandidates) {
            await entry.connection.addIceCandidate(candidate).catch(() => {});
          }
          entry.pendingCandidates = [];
        }
      } else if ("candidate" in data && entry) {
        if (entry.connection.remoteDescription) {
          await entry.connection.addIceCandidate(data.candidate).catch(() => {});
        } else {
          entry.pendingCandidates.push(data.candidate);
        }
      }
    };

    setSignalHandler((from, data) => {
      void handler(from, data);
    });
    return () => setSignalHandler(null);
  }, [active, localSessionId, createPeer, setSignalHandler]);

  // Keep the connection mesh in sync with who is seated.
  useEffect(() => {
    if (!active || !micReady || !localSessionId) return;

    for (const peerId of peerIds) {
      if (peersRef.current.has(peerId)) continue;
      // Deterministic initiator avoids both sides sending offers (glare):
      // the lexicographically larger session id calls the other one.
      if (localSessionId > peerId) {
        createPeer(peerId, true);
      }
    }

    for (const peerId of Array.from(peersRef.current.keys())) {
      if (!peerIds.includes(peerId)) {
        closePeer(peerId);
      }
    }
  }, [active, micReady, localSessionId, peerIds, createPeer, closePeer]);

  // Poll analysers for speaking indicators (local + each remote peer).
  useEffect(() => {
    if (!active) return;

    const buffer = new Uint8Array(128);
    const level = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / buffer.length);
    };

    const timer = window.setInterval(() => {
      const next = new Set<string>();
      if (
        localSessionId &&
        !mutedRef.current &&
        level(localAnalyserRef.current) > SPEAKING_THRESHOLD
      ) {
        next.add(localSessionId);
      }
      peersRef.current.forEach((entry, peerId) => {
        if (level(entry.analyser) > SPEAKING_THRESHOLD) {
          next.add(peerId);
        }
      });
      setSpeakingIds((current) => {
        if (
          current.size === next.size &&
          Array.from(next).every((id) => current.has(id))
        ) {
          return current;
        }
        return next;
      });
    }, 200);

    return () => window.clearInterval(timer);
  }, [active, localSessionId]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  return {
    micReady,
    micError,
    muted,
    toggleMute,
    speakingIds,
    connectedIds,
  };
}
