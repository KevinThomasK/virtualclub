"use client";

import { useEffect, useRef } from "react";

type ClubMusicProps = {
  enabled: boolean;
  boost: boolean;
  /** DJ queue winner: bass / chill / hyper — reshapes the procedural loop. */
  mode?: string;
};

/** Procedural four-on-the-floor club loop (no external files, works offline). */
export function ClubMusic({ enabled, boost, mode = "" }: ClubMusicProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bassRef = useRef<OscillatorNode | null>(null);
  const padRef = useRef<OscillatorNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!enabled) {
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
        masterGainRef.current = null;
        bassRef.current = null;
        padRef.current = null;
        bassFilterRef.current = null;
      }
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = boost ? 0.22 : 0.14;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const bass = ctx.createOscillator();
    bass.type = "sawtooth";
    bass.frequency.value = 55;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.08;
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 180;
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(master);
    bass.start();
    bassRef.current = bass;
    bassFilterRef.current = bassFilter;

    const pad = ctx.createOscillator();
    pad.type = "triangle";
    pad.frequency.value = 110;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.025;
    pad.connect(padGain);
    padGain.connect(master);
    pad.start();
    padRef.current = pad;

    let step = 0;
    const interval = window.setInterval(() => {
      if (ctx.state === "closed") return;
      const t = ctx.currentTime;
      step = (step + 1) % 16;
      const beat = step % 4 === 0;
      const loud = masterGainRef.current?.gain.value ?? 0.14;
      const isBoost = loud > 0.18;
      const currentMode = modeRef.current;

      if (beat) {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = "sine";
        const kickStart =
          currentMode === "bass" ? 180 : currentMode === "hyper" ? 160 : 150;
        const kickEnd =
          currentMode === "bass" ? 36 : currentMode === "chill" ? 50 : 42;
        kick.frequency.setValueAtTime(kickStart, t);
        kick.frequency.exponentialRampToValueAtTime(kickEnd, t + 0.12);
        const kickVol =
          currentMode === "bass"
            ? isBoost
              ? 0.42
              : 0.34
            : currentMode === "chill"
              ? 0.2
              : isBoost
                ? 0.35
                : 0.28;
        kickGain.gain.setValueAtTime(kickVol, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        kick.connect(kickGain);
        kickGain.connect(master);
        kick.start(t);
        kick.stop(t + 0.2);

        const bassNote =
          currentMode === "bass"
            ? step % 8 === 0
              ? 40
              : 48
            : currentMode === "chill"
              ? 62
              : currentMode === "hyper"
                ? step % 8 === 0
                  ? 70
                  : 55
                : step % 8 === 0
                  ? 48
                  : 55;
        bass.frequency.setTargetAtTime(bassNote, t, 0.05);
      }

      // Hyper mode adds off-beat clacks; chill skips some hats.
      const hatOn =
        currentMode === "hyper"
          ? step % 2 === 1 || step % 4 === 2
          : currentMode === "chill"
            ? step % 4 === 1
            : step % 2 === 1;

      if (hatOn) {
        const hat = ctx.createOscillator();
        const hatGain = ctx.createGain();
        hat.type = "square";
        hat.frequency.value = currentMode === "hyper" ? 10000 : 8000;
        hatGain.gain.setValueAtTime(
          currentMode === "chill" ? 0.008 : currentMode === "hyper" ? 0.022 : 0.015,
          t,
        );
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        const hatFilter = ctx.createBiquadFilter();
        hatFilter.type = "highpass";
        hatFilter.frequency.value = 6000;
        hat.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(master);
        hat.start(t);
        hat.stop(t + 0.05);
      }
    }, 125);

    void ctx.resume();

    return () => {
      window.clearInterval(interval);
      void ctx.close();
      ctxRef.current = null;
      masterGainRef.current = null;
      bassRef.current = null;
      padRef.current = null;
      bassFilterRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const master = masterGainRef.current;
    if (!master) return;
    const base = boost || mode === "bass" || mode === "hyper" ? 0.22 : 0.14;
    const chillSoft = mode === "chill" ? 0.16 : base;
    master.gain.setTargetAtTime(
      mode === "chill" ? chillSoft : base,
      master.context.currentTime,
      0.08,
    );
  }, [boost, mode]);

  useEffect(() => {
    const bassFilter = bassFilterRef.current;
    const pad = padRef.current;
    if (!bassFilter || !pad) return;
    const t = bassFilter.context.currentTime;
    if (mode === "bass") {
      bassFilter.frequency.setTargetAtTime(120, t, 0.2);
      pad.frequency.setTargetAtTime(90, t, 0.2);
    } else if (mode === "chill") {
      bassFilter.frequency.setTargetAtTime(240, t, 0.2);
      pad.frequency.setTargetAtTime(140, t, 0.2);
    } else if (mode === "hyper") {
      bassFilter.frequency.setTargetAtTime(280, t, 0.2);
      pad.frequency.setTargetAtTime(165, t, 0.2);
    } else {
      bassFilter.frequency.setTargetAtTime(180, t, 0.2);
      pad.frequency.setTargetAtTime(110, t, 0.2);
    }
  }, [mode]);

  return null;
}
