"use client";

import { useEffect, useRef } from "react";

type ClubMusicProps = {
  enabled: boolean;
  boost: boolean;
};

/** Procedural four-on-the-floor club loop (no external files, works offline). */
export function ClubMusic({ enabled, boost }: ClubMusicProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
        masterGainRef.current = null;
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

    const pad = ctx.createOscillator();
    pad.type = "triangle";
    pad.frequency.value = 110;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.025;
    pad.connect(padGain);
    padGain.connect(master);
    pad.start();

    let step = 0;
    const interval = window.setInterval(() => {
      if (ctx.state === "closed") return;
      const t = ctx.currentTime;
      step = (step + 1) % 16;
      const beat = step % 4 === 0;
      const loud = masterGainRef.current?.gain.value ?? 0.14;
      const isBoost = loud > 0.18;

      if (beat) {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = "sine";
        kick.frequency.setValueAtTime(150, t);
        kick.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        kickGain.gain.setValueAtTime(isBoost ? 0.35 : 0.28, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        kick.connect(kickGain);
        kickGain.connect(master);
        kick.start(t);
        kick.stop(t + 0.2);

        bass.frequency.setTargetAtTime(beat && step % 8 === 0 ? 48 : 55, t, 0.05);
      }

      if (step % 2 === 1) {
        const hat = ctx.createOscillator();
        const hatGain = ctx.createGain();
        hat.type = "square";
        hat.frequency.value = 8000;
        hatGain.gain.setValueAtTime(0.015, t);
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
    };
  }, [enabled]);

  useEffect(() => {
    const master = masterGainRef.current;
    if (!master) return;
    master.gain.setTargetAtTime(boost ? 0.22 : 0.14, master.context.currentTime, 0.08);
  }, [boost]);

  return null;
}
