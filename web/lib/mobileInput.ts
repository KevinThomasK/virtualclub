"use client";

/** Shared touch input — written by MobileControls, read by the 3D loop. */
export type MobileInputState = {
  /** Strafe axis: -1 left … 1 right */
  x: number;
  /** Move axis: -1 back … 1 forward */
  y: number;
  /** Look deltas accumulated since last frame (pixels). */
  lookX: number;
  lookY: number;
  sprint: boolean;
};

export const mobileInput: MobileInputState = {
  x: 0,
  y: 0,
  lookX: 0,
  lookY: 0,
  sprint: false,
};

export function resetMobileInput() {
  mobileInput.x = 0;
  mobileInput.y = 0;
  mobileInput.lookX = 0;
  mobileInput.lookY = 0;
  mobileInput.sprint = false;
}

export function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 768px)").matches
  );
}
