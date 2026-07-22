"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mobileInput, resetMobileInput } from "@/lib/mobileInput";

type MobileControlsProps = {
  onInteract: () => void;
  onDance: () => void;
  visible: boolean;
};

/**
 * On-screen twin-stick style controls for phones/tablets:
 * left joystick = move, right drag pad = look, thumb buttons = actions.
 */
export function MobileControls({
  onInteract,
  onDance,
  visible,
}: MobileControlsProps) {
  const [sprint, setSprint] = useState(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<HTMLDivElement>(null);
  const moveId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible) resetMobileInput();
    return () => resetMobileInput();
  }, [visible]);

  useEffect(() => {
    mobileInput.sprint = sprint;
  }, [sprint]);

  const setKnob = useCallback((nx: number, ny: number) => {
    const knob = knobRef.current;
    if (!knob) return;
    const max = 28;
    knob.style.transform = `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;
  }, []);

  const onStickDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    moveId.current = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    updateStick(event.clientX, event.clientY);
  };

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (clientX - cx) / (rect.width / 2);
    let dy = (clientY - cy) / (rect.height / 2);
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    // Dead zone
    const dead = 0.12;
    mobileInput.x = Math.abs(dx) < dead ? 0 : dx;
    mobileInput.y = Math.abs(dy) < dead ? 0 : -dy; // screen up = forward
    setKnob(dx, dy);
  };

  const onStickMove = (event: React.PointerEvent) => {
    if (moveId.current !== event.pointerId) return;
    event.preventDefault();
    updateStick(event.clientX, event.clientY);
  };

  const onStickUp = (event: React.PointerEvent) => {
    if (moveId.current !== event.pointerId) return;
    moveId.current = null;
    mobileInput.x = 0;
    mobileInput.y = 0;
    setKnob(0, 0);
  };

  const onLookDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    lookId.current = event.pointerId;
    lookLast.current = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onLookMove = (event: React.PointerEvent) => {
    if (lookId.current !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - lookLast.current.x;
    const dy = event.clientY - lookLast.current.y;
    lookLast.current = { x: event.clientX, y: event.clientY };
    mobileInput.lookX += dx;
    mobileInput.lookY += dy;
  };

  const onLookUp = (event: React.PointerEvent) => {
    if (lookId.current !== event.pointerId) return;
    lookId.current = null;
  };

  if (!visible) return null;

  return (
    <div
      className="mobile-controls"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 45,
        pointerEvents: "none",
        touchAction: "none",
      }}
    >
      {/* Move joystick — left thumb */}
      <div
        ref={stickRef}
        className="mobile-controls__stick"
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
        style={{
          position: "absolute",
          left: "max(8px, env(safe-area-inset-left))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "rgba(10, 11, 18, 0.28)",
          border: "1px solid rgba(255,255,255,0.12)",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <div
          ref={knobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "rgba(129, 140, 248, 0.75)",
            border: "2px solid rgba(255,255,255,0.28)",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Look pad — right thumb */}
      <div
        ref={lookRef}
        className="mobile-controls__look"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
        style={{
          position: "absolute",
          right: "max(8px, env(safe-area-inset-right))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          width: 96,
          height: 96,
          borderRadius: 22,
          background: "rgba(10, 11, 18, 0.22)",
          border: "1px dashed rgba(255,255,255,0.14)",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />

      {/* Action cluster */}
      <div
        style={{
          position: "absolute",
          right: "max(8px, env(safe-area-inset-right))",
          bottom: "max(124px, calc(112px + env(safe-area-inset-bottom)))",
          display: "grid",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          className="mobile-controls__btn mobile-controls__btn--primary"
          onClick={onInteract}
        >
          G
          <span>Go</span>
        </button>
        <button
          type="button"
          className="mobile-controls__btn"
          onClick={onDance}
        >
          💃
        </button>
        <button
          type="button"
          className={`mobile-controls__btn ${sprint ? "mobile-controls__btn--on" : ""}`}
          onClick={() => setSprint((v) => !v)}
        >
          ⚡
        </button>
      </div>
    </div>
  );
}
