"use client";

import { useEffect, useRef } from "react";

type ClubMusicProps = {
  enabled: boolean;
  boost: boolean;
  /** DJ queue winner: bass / chill / hyper — picks a different arrangement. */
  mode?: string;
};

type TrackProfile = {
  bpm: number;
  swing: number;
  master: number;
  kickVol: number;
  snareVol: number;
  hatVol: number;
  bassVol: number;
  padVol: number;
  leadVol: number;
  /** Root frequencies for a 4-bar chord loop (one chord per bar). */
  chords: number[][];
  bassPattern: (number | null)[];
  leadPattern: (number | null)[];
  kickHits: boolean[];
  snareHits: boolean[];
};

/** Richer Web Audio DJ set — still fully procedural (no audio files / licenses). */
export function ClubMusic({ enabled, boost, mode = "" }: ClubMusicProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const modeRef = useRef(mode);
  const boostRef = useRef(boost);
  modeRef.current = mode;
  boostRef.current = boost;

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
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    // Soft compressor keeps drops from clipping when layers stack.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.22;
    master.disconnect();
    master.connect(comp);
    comp.connect(ctx.destination);

    const noiseBuffer = makeNoiseBuffer(ctx);

    let step = 0;
    let bar = 0;
    let timer = 0;
    let lastMode = "";

    const schedule = () => {
      if (ctx.state === "closed") return;

      const profile = getTrack(modeRef.current);
      if (modeRef.current !== lastMode) {
        step = 0;
        bar = 0;
        lastMode = modeRef.current;
      }

      const sixteenth = 60 / profile.bpm / 4;
      const swing =
        step % 2 === 1 ? sixteenth * profile.swing : 0;
      const t = ctx.currentTime + 0.03 + swing;
      const isBoost = boostRef.current;
      const loudScale = isBoost ? 1.2 : 1;

      master.gain.setTargetAtTime(
        profile.master * (isBoost ? 1.15 : 1),
        ctx.currentTime,
        0.12,
      );

      const chord = profile.chords[bar % profile.chords.length];
      const i = step % 16;

      if (profile.kickHits[i]) {
        playKick(ctx, master, t, profile.kickVol * loudScale, modeRef.current);
      }
      if (profile.snareHits[i]) {
        playSnare(ctx, master, noiseBuffer, t, profile.snareVol * loudScale);
      }
      // Closed hats on most off-steps; open hat on 15 for groove.
      if (i % 2 === 1 || modeRef.current === "hyper") {
        playHat(
          ctx,
          master,
          noiseBuffer,
          t,
          profile.hatVol * (i === 15 ? 1.4 : 1) * loudScale,
          i === 15 || (modeRef.current === "hyper" && i % 4 === 3),
        );
      }
      // Occasional clap layer on 4 & 12 for club feel.
      if ((i === 4 || i === 12) && modeRef.current !== "chill") {
        playClap(ctx, master, noiseBuffer, t, 0.045 * loudScale);
      }

      const bassNote = profile.bassPattern[i];
      if (bassNote != null) {
        const root = chord[0];
        playBass(
          ctx,
          master,
          t,
          root * bassNote,
          profile.bassVol * loudScale,
          modeRef.current,
        );
      }

      // Chord stab on downbeats + soft pad sustain every bar start.
      if (i === 0) {
        playPad(ctx, master, t, chord, profile.padVol * loudScale, modeRef.current);
      }
      if (i === 0 || i === 8) {
        playChordStab(ctx, master, t, chord, 0.03 * loudScale, modeRef.current);
      }

      const leadNote = profile.leadPattern[i];
      if (leadNote != null) {
        playLead(
          ctx,
          master,
          t,
          chord[0] * leadNote,
          profile.leadVol * loudScale,
          modeRef.current,
        );
      }

      // Mini riser into every 4th bar (drop energy).
      if (i === 14 && bar % 4 === 3) {
        playRiser(ctx, master, noiseBuffer, t, 0.04 * loudScale);
      }

      step += 1;
      if (step % 16 === 0) bar += 1;

      timer = window.setTimeout(schedule, sixteenth * 1000);
    };

    void ctx.resume().then(() => {
      schedule();
    });

    return () => {
      window.clearTimeout(timer);
      void ctx.close();
      ctxRef.current = null;
      masterGainRef.current = null;
    };
  }, [enabled]);

  return null;
}

function getTrack(mode: string): TrackProfile {
  if (mode === "bass") {
    return {
      bpm: 124,
      swing: 0.04,
      master: 0.2,
      kickVol: 0.42,
      snareVol: 0.2,
      hatVol: 0.028,
      bassVol: 0.14,
      padVol: 0.03,
      leadVol: 0.035,
      chords: [
        [41.2, 61.74, 82.41], // E
        [36.71, 55.0, 73.42], // D
        [32.7, 49.0, 65.41], // C
        [36.71, 55.0, 73.42], // D
      ],
      bassPattern: [
        1, null, 1, null, 1.5, null, 1, null, 1, null, 0.75, null, 1, 1.5, null, 1,
      ],
      leadPattern: [
        null, null, 2, null, null, 2.5, null, 2, null, null, 3, null, null, 2, null, null,
      ],
      kickHits: [
        true, false, false, true, true, false, false, false, true, false, true, false, true, false, false, false,
      ],
      snareHits: [
        false, false, false, false, true, false, false, true, false, false, false, false, true, false, true, false,
      ],
    };
  }

  if (mode === "chill") {
    return {
      bpm: 98,
      swing: 0.12,
      master: 0.15,
      kickVol: 0.22,
      snareVol: 0.1,
      hatVol: 0.014,
      bassVol: 0.07,
      padVol: 0.055,
      leadVol: 0.04,
      chords: [
        [55.0, 69.3, 82.41, 110], // A minor 7-ish
        [49.0, 61.74, 73.42, 98], // G
        [43.65, 55.0, 65.41, 87.31], // F
        [41.2, 51.91, 61.74, 82.41], // E
      ],
      bassPattern: [
        1, null, null, 1, null, null, 1.5, null, 1, null, null, null, 0.75, null, 1, null,
      ],
      leadPattern: [
        2, null, 2.25, null, 2.5, null, null, 3, null, 2.5, null, 2, null, null, 1.5, null,
      ],
      kickHits: [
        true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false,
      ],
      snareHits: [
        false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false,
      ],
    };
  }

  if (mode === "hyper") {
    return {
      bpm: 148,
      swing: 0.02,
      master: 0.19,
      kickVol: 0.36,
      snareVol: 0.18,
      hatVol: 0.04,
      bassVol: 0.11,
      padVol: 0.028,
      leadVol: 0.055,
      chords: [
        [55.0, 65.41, 82.41], // A
        [61.74, 73.42, 92.5], // B
        [65.41, 82.41, 98.0], // C
        [73.42, 92.5, 110.0], // D
      ],
      bassPattern: [
        1, 1, null, 1, 1.5, 1, null, 1, 1, null, 1.25, 1, 2, null, 1.5, 1,
      ],
      leadPattern: [
        3, 4, 3, 2.5, 3, null, 4, 5, 4, 3, 4, null, 5, 4, 3, 2,
      ],
      kickHits: [
        true, false, true, false, true, false, true, true, true, false, true, false, true, false, true, false,
      ],
      snareHits: [
        false, false, false, false, true, false, false, true, false, false, false, false, true, true, false, true,
      ],
    };
  }

  // Default house groove
  return {
    bpm: 126,
    swing: 0.06,
    master: 0.16,
    kickVol: 0.32,
    snareVol: 0.15,
    hatVol: 0.022,
    bassVol: 0.09,
    padVol: 0.04,
    leadVol: 0.04,
    chords: [
      [55.0, 69.3, 82.41], // Am
      [43.65, 55.0, 65.41], // F
      [32.7, 41.2, 49.0], // C
      [49.0, 61.74, 73.42], // G
    ],
    bassPattern: [
      1, null, 1, null, null, 1, 1.5, null, 1, null, 0.75, null, 1, null, 1.5, 1,
    ],
    leadPattern: [
      null, 2, null, 2.5, null, 3, null, 2, null, 2.5, null, 3, 4, null, 3, null,
    ],
    kickHits: [
      true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, true,
    ],
    snareHits: [
      false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false,
    ],
  };
}

function makeNoiseBuffer(ctx: AudioContext) {
  const length = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playKick(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  vol: number,
  mode: string,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const startF = mode === "bass" ? 190 : mode === "chill" ? 130 : 160;
  const endF = mode === "bass" ? 38 : mode === "chill" ? 48 : 42;
  osc.frequency.setValueAtTime(startF, t);
  osc.frequency.exponentialRampToValueAtTime(endF, t + 0.14);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (mode === "bass" ? 0.28 : 0.18));
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.3);

  // Sub thump
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.value = endF * 0.5;
  subGain.gain.setValueAtTime(vol * 0.45, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  sub.connect(subGain);
  subGain.connect(dest);
  sub.start(t);
  sub.stop(t + 0.25);
}

function playSnare(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vol: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t);
  src.stop(t + 0.18);

  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(220, t);
  tone.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  toneGain.gain.setValueAtTime(vol * 0.5, t);
  toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  tone.connect(toneGain);
  toneGain.connect(dest);
  tone.start(t);
  tone.stop(t + 0.12);
}

function playHat(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vol: number,
  open: boolean,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = open ? 7000 : 9000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.18 : 0.04));
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t);
  src.stop(t + (open ? 0.2 : 0.05));
}

function playClap(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vol: number,
) {
  for (let i = 0; i < 3; i += 1) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    const start = t + i * 0.012;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(start);
    src.stop(start + 0.1);
  }
}

function playBass(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  freq: number,
  vol: number,
  mode: string,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = mode === "chill" ? "triangle" : "sawtooth";
  osc.frequency.setValueAtTime(Math.max(30, freq), t);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(mode === "bass" ? 140 : mode === "hyper" ? 320 : 220, t);
  filter.Q.value = 6;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (mode === "chill" ? 0.28 : 0.16));
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.32);
}

function playPad(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  chord: number[],
  vol: number,
  mode: string,
) {
  const duration = mode === "chill" ? 2.2 : 1.6;
  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mode === "hyper" ? "sawtooth" : "sine";
    osc.frequency.value = freq * (mode === "chill" ? 2 : 1);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol / (idx + 1.2), t + 0.2);
    gain.gain.linearRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  });
}

function playChordStab(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  chord: number[],
  vol: number,
  mode: string,
) {
  chord.slice(0, 3).forEach((freq) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq * 2;
    filter.type = "lowpass";
    filter.frequency.value = mode === "bass" ? 600 : 1400;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

function playLead(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  freq: number,
  vol: number,
  mode: string,
) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = mode === "chill" ? "sine" : "square";
  osc2.type = "sine";
  osc.frequency.value = freq;
  osc2.frequency.value = freq * 2.005;
  filter.type = "lowpass";
  filter.frequency.value = mode === "hyper" ? 3200 : 1800;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (mode === "chill" ? 0.35 : 0.14));
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 0.4);
  osc2.stop(t + 0.4);
}

function playRiser(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vol: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(4000, t + 0.45);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.35);
  gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t);
  src.stop(t + 0.52);
}
