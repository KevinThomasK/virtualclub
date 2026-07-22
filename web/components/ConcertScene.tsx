"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Text, AdaptiveDpr } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Avatar } from "@/components/Avatar";
import { ClubCollectibles } from "@/components/ClubCollectibles";
import { ClubEnvironment } from "@/components/ClubEnvironment";
import { PhotoFlashes } from "@/components/PhotoFlashes";
import { CLUB_BOUNDS, VOICE_SEATS, getSeatWorld, isLoungeSeat, isVoiceSeat } from "@/lib/clubLayout";
import { CONCERT_ZONES, getZoneAt } from "@/lib/concertZones";
import type { ConcertZone } from "@/lib/concertZones";
import type { AvatarOutfit } from "@/lib/avatarCatalog";
import type { LiveTarget } from "@/hooks/useConcertRoom";
import type { PhotoFlashEvent } from "@/hooks/useConcertRoom";
import type { EmoteType, PlayerSnapshot } from "@/lib/types";
import { isCoarsePointer, mobileInput } from "@/lib/mobileInput";

const MOVE_SPEED = 5.4;
const SPRINT_MULTIPLIER = 1.75;
const CAMERA_DISTANCE = 6.2;
const MOUSE_YAW_SENSITIVITY = 0.0045;
const MOUSE_PITCH_SENSITIVITY = 0.0032;
const MIN_CAMERA_PITCH = 0.2;
const MAX_CAMERA_PITCH = 1.15;
/** Higher = camera sticks closer to the player (less floaty lag). */
const CAMERA_FOLLOW = 28;
const TURN_SPEED = 20;
const MAX_FRAME_DELTA = 0.05;

/** Shortest-arc angle blend — avoids full spins when turning past ±π. */
function lerpAngle(from: number, to: number, t: number) {
  const delta =
    THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  return from + delta * t;
}

function damp(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

type SceneProps = {
  sessionId: string | null;
  localName: string;
  localOutfit: AvatarOutfit;
  players: PlayerSnapshot[];
  liveTargets: Map<string, LiveTarget>;
  dropUntil: number;
  partyUntil: number;
  djMode: string;
  photoFlashes: PhotoFlashEvent[];
  /** Optimistic seat while waiting for server sit ack. */
  pendingSeat?: number | null;
  onMove: (payload: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    anim: "idle" | "walk";
  }) => void;
  onEmote: (emote: EmoteType) => void;
  onZoneChange: (zone: ConcertZone | null) => void;
  onMouseLookChange?: (active: boolean) => void;
  collectedTokenIds: Set<string>;
  glowBuffActive: boolean;
  onPositionUpdate: (x: number, z: number) => void;
  onInteract: () => void;
  onSit: (seatIndex: number) => void;
  speakingIds: Set<string>;
};

function Confetti({ boost }: { boost: boolean }) {
  const count = boost ? 120 : 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(
    () => ["#ff2e88", "#2ee6ff", "#ffd23f", "#7bff6b", "#b388ff"],
    [],
  );
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: THREE.MathUtils.randFloatSpread(46),
        y: THREE.MathUtils.randFloat(3, 11),
        z: THREE.MathUtils.randFloat(-18, 18),
        fall: THREE.MathUtils.randFloat(boost ? 1.2 : 0.6, boost ? 2.4 : 1.4),
        spin: THREE.MathUtils.randFloat(1, 3),
      })),
    [boost, count],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particles.forEach((_, i) => {
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles, colors]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particles.forEach((p, i) => {
      p.y -= p.fall * delta;
      if (p.y < 0) p.y = 11;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.y * p.spin, p.y * p.spin * 0.6, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.08, 0.08]} />
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function InteractiveZones() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    CONCERT_ZONES.forEach((zone, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const pulse = 0.85 + Math.sin(t * 2 + i) * 0.15;
      mesh.scale.set(pulse, 1, pulse);
    });
  });

  return (
    <group>
      {CONCERT_ZONES.map((zone, i) => (
        <group key={zone.id} position={[zone.x, 0.03, zone.z]}>
          <mesh
            ref={(el) => {
              refs.current[i] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[zone.radius * 0.72, zone.radius, 48]} />
            <meshBasicMaterial
              color={zone.color}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[zone.radius * 0.35, 24]} />
            <meshBasicMaterial
              color={zone.color}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FollowSpotlight({
  target,
  active,
}: {
  target: THREE.Vector3;
  active: boolean;
}) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    const light = lightRef.current;
    if (!light) return;
    light.intensity = THREE.MathUtils.lerp(
      light.intensity,
      active ? 55 : 0,
      Math.min(1, delta * 4),
    );
    scratchPos.set(target.x, 9, target.z + 2);
    light.position.lerp(scratchPos, Math.min(1, delta * 4));
    scratchTarget.set(target.x, 0.5, target.z);
    light.target.position.lerp(scratchTarget, Math.min(1, delta * 4));
    light.target.updateMatrixWorld();
  });

  return (
    <spotLight
      ref={lightRef}
      angle={0.35}
      penumbra={0.5}
      distance={28}
      color="#c4b5fd"
      intensity={0}
    />
  );
}

function ZoneLabels() {
  return (
    <group>
      {CONCERT_ZONES.map((zone) => (
        <group key={zone.id} position={[zone.x, 2.8, zone.z]}>
          <Text
            fontSize={0.38}
            color={zone.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#000000"
          >
            {zone.label.toUpperCase()}
          </Text>
          <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[zone.radius * 0.55, zone.radius * 0.62, 32]} />
            <meshBasicMaterial color={zone.color} transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function applyLookDelta(
  dx: number,
  dy: number,
  yawRef: React.MutableRefObject<number>,
  pitchRef: React.MutableRefObject<number>,
  rotationRef: React.MutableRefObject<number>,
) {
  if (dx === 0 && dy === 0) return;
  yawRef.current -= dx * MOUSE_YAW_SENSITIVITY;
  pitchRef.current = THREE.MathUtils.clamp(
    pitchRef.current + dy * MOUSE_PITCH_SENSITIVITY,
    MIN_CAMERA_PITCH,
    MAX_CAMERA_PITCH,
  );
  rotationRef.current = yawRef.current;
}

function MouseLookControls({
  yawRef,
  pitchRef,
  rotationRef,
  isLookingRef,
  onMouseLookChange,
}: {
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  rotationRef: React.MutableRefObject<number>;
  isLookingRef: React.MutableRefObject<boolean>;
  onMouseLookChange?: (active: boolean) => void;
}) {
  const { gl } = useThree();
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const lockedRef = useRef(false);
  const suppressLockClickRef = useRef(false);
  const dragDistanceRef = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.touchAction = "none";
    const mobile = isCoarsePointer();

    const setLocked = (locked: boolean) => {
      lockedRef.current = locked;
      canvas.style.cursor = locked ? "none" : "grab";
      onMouseLookChange?.(locked);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 2) return;
      if (document.pointerLockElement === canvas) return;

      draggingRef.current = true;
      dragDistanceRef.current = 0;
      isLookingRef.current = true;
      canvas.style.cursor = "grabbing";
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas) {
        applyLookDelta(
          event.movementX,
          event.movementY,
          yawRef,
          pitchRef,
          rotationRef,
        );
        isLookingRef.current = true;
        return;
      }

      if (!draggingRef.current) return;

      const dx = event.clientX - lastPointerRef.current.x;
      const dy = event.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
      applyLookDelta(dx, dy, yawRef, pitchRef, rotationRef);
      isLookingRef.current = true;
    };

    const endDrag = (event: PointerEvent) => {
      if (dragDistanceRef.current > 6) {
        suppressLockClickRef.current = true;
      }
      draggingRef.current = false;
      isLookingRef.current = false;
      if (document.pointerLockElement !== canvas) {
        canvas.style.cursor = "grab";
      }
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onCanvasClick = () => {
      if (mobile) return; // phones use on-screen look pad, not pointer lock
      if (suppressLockClickRef.current) {
        suppressLockClickRef.current = false;
        return;
      }
      if (document.pointerLockElement === canvas) return;
      void canvas.requestPointerLock();
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setLocked(locked);
      isLookingRef.current = locked;
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }, [gl, isLookingRef, onMouseLookChange, pitchRef, rotationRef, yawRef]);

  return null;
}

function CameraRig({
  target,
  yawRef,
  pitchRef,
}: {
  target: THREE.Vector3;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const horizontalDist = CAMERA_DISTANCE * Math.cos(pitch);
    const height = 1.6 + CAMERA_DISTANCE * Math.sin(pitch);

    const backX = Math.sin(yaw) * horizontalDist;
    const backZ = Math.cos(yaw) * horizontalDist;

    let camX = target.x - backX;
    let camZ = target.z - backZ;
    camX = THREE.MathUtils.clamp(camX, CLUB_BOUNDS.minX + 3, CLUB_BOUNDS.maxX - 3);
    camZ = THREE.MathUtils.clamp(camZ, CLUB_BOUNDS.minZ + 3, CLUB_BOUNDS.maxZ - 3);

    desired.current.set(camX, target.y + height, camZ);
    // Exponential damping stays smooth at any framerate (no frame-spike jerks).
    const blend = 1 - Math.exp(-CAMERA_FOLLOW * delta);
    camera.position.lerp(desired.current, blend);

    lookAt.current.x = damp(lookAt.current.x, target.x, CAMERA_FOLLOW, delta);
    lookAt.current.y = damp(lookAt.current.y, target.y + 1.5, CAMERA_FOLLOW, delta);
    lookAt.current.z = damp(lookAt.current.z, target.z, CAMERA_FOLLOW, delta);
    camera.lookAt(lookAt.current);
  });

  return null;
}

function VoiceSeats({
  players,
  localSeat,
  onSit,
}: {
  players: PlayerSnapshot[];
  localSeat: number;
  onSit: (seatIndex: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const occupiedSeats = useMemo(
    () =>
      new Set(
        players.filter((p) => isVoiceSeat(p.seat)).map((p) => p.seat),
      ),
    [players],
  );
  const canSit = !isVoiceSeat(localSeat);

  return (
    <group>
      {VOICE_SEATS.map((seat, i) => {
        const free = !occupiedSeats.has(i);
        const clickable = free && canSit;
        const highlight = clickable && hovered === i;

        return (
          <group key={i} position={[seat.x, 0, seat.z]} rotation={[0, seat.rotY, 0]}>
            {/* Stool */}
            <mesh
              position={[0, 0.36, 0]}
              castShadow
              onClick={
                clickable
                  ? (event) => {
                      event.stopPropagation();
                      // Keep this click from also triggering pointer-lock
                      // (mouse-look) on the canvas.
                      event.nativeEvent.stopImmediatePropagation();
                      onSit(i);
                    }
                  : undefined
              }
              onPointerOver={
                clickable
                  ? (event) => {
                      event.stopPropagation();
                      setHovered(i);
                      document.body.style.cursor = "pointer";
                    }
                  : undefined
              }
              onPointerOut={
                clickable
                  ? () => {
                      setHovered((current) => (current === i ? null : current));
                      document.body.style.cursor = "";
                    }
                  : undefined
              }
            >
              <cylinderGeometry args={[0.34, 0.38, 0.14, 16]} />
              <meshStandardMaterial
                color={highlight ? "#10b981" : "#0f3d33"}
                emissive={highlight ? "#34d399" : "#10b981"}
                emissiveIntensity={highlight ? 0.9 : free ? 0.25 : 0.05}
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 0.3, 10]} />
              <meshStandardMaterial color="#3f3f46" metalness={0.8} roughness={0.35} />
            </mesh>

            {/* Free-seat indicator */}
            {clickable ? (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                  <ringGeometry args={[0.42, 0.5, 24]} />
                  <meshBasicMaterial
                    color="#34d399"
                    transparent
                    opacity={highlight ? 0.9 : 0.35}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {highlight ? (
                  <Text
                    position={[0, 1.05, 0]}
                    fontSize={0.18}
                    color="#a7f3d0"
                    anchorX="center"
                  >
                    click to sit & talk
                  </Text>
                ) : null}
              </>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function LocalController({
  sessionId,
  localName,
  localOutfit,
  players,
  pendingSeat,
  onMove,
  onEmote,
  onZoneChange,
  onMouseLookChange,
  collectedTokenIds,
  glowBuffActive,
  onPositionUpdate,
  onInteract,
  speakingIds,
}: SceneProps) {
  const localPlayer = players.find((player) => player.sessionId === sessionId);
  const serverSeat = localPlayer?.seat ?? -1;
  const localSeat =
    serverSeat >= 0 ? serverSeat : (pendingSeat ?? -1);
  const seated = localSeat >= 0;
  const groupRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const positionRef = useRef(new THREE.Vector3(0, 0, 6));
  const rotationRef = useRef(Math.PI);
  const cameraYawRef = useRef(Math.PI);
  const cameraPitchRef = useRef(0.42);
  const isLookingRef = useRef(false);
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const camForward = useMemo(() => new THREE.Vector3(), []);
  const camRight = useMemo(() => new THREE.Vector3(), []);
  const initializedRef = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const lastSentRef = useRef(0);
  const lastZoneRef = useRef<string | null>(null);
  const emoteUntilRef = useRef(0);
  const [anim, setAnim] = useState<
    "idle" | "walk" | "dance" | "wave" | "cheer" | "pose" | "sit" | "chill"
  >("idle");
  const [currentZone, setCurrentZone] = useState<ConcertZone | null>(null);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);

  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  const triggerEmote = (emote: EmoteType) => {
    setAnim(emote);
    onEmote(emote);
    emoteUntilRef.current = performance.now() + 2800;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      keysRef.current[event.code] = true;

      if (event.code === "Space") {
        event.preventDefault();
        triggerEmote("dance");
      }
      if (event.code === "KeyE") triggerEmote("wave");
      if (event.code === "KeyF") triggerEmote("cheer");
      if (event.code === "KeyR") triggerEmote("pose");
      if (event.code === "KeyG") {
        event.preventDefault();
        onInteractRef.current();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onEmote]);

  useEffect(() => {
    if (localPlayer && !initializedRef.current) {
      positionRef.current.set(localPlayer.x, 0, localPlayer.z);
      rotationRef.current = localPlayer.rotY;
      cameraYawRef.current = localPlayer.rotY;
      initializedRef.current = true;
    }
  }, [localPlayer]);

  useEffect(() => {
    if (
      localPlayer &&
      ["dance", "wave", "cheer", "pose"].includes(localPlayer.anim)
    ) {
      setAnim(localPlayer.anim);
      // Keep emote locked so the locomotion loop doesn't instantly wipe pose
      // (photo booth used to look like "nothing happened").
      emoteUntilRef.current = performance.now() + 2800;
    }
  }, [localPlayer?.anim]);

  // When the server (or optimistic pending seat) confirms a seat, snap onto it.
  useEffect(() => {
    if (localSeat >= 0) {
      const seat = getSeatWorld(localSeat);
      if (seat) {
        positionRef.current.set(seat.x, 0, seat.z);
        rotationRef.current = seat.rotY;
        setAnim(isLoungeSeat(localSeat) ? "chill" : "sit");
        emoteUntilRef.current = 0;
      }
    }
  }, [localSeat]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    const keys = keysRef.current;
    const inEmote = performance.now() < emoteUntilRef.current;

    // Consume touch look deltas from the on-screen look pad.
    if (mobileInput.lookX !== 0 || mobileInput.lookY !== 0) {
      applyLookDelta(
        mobileInput.lookX,
        mobileInput.lookY,
        cameraYawRef,
        cameraPitchRef,
        rotationRef,
      );
      mobileInput.lookX = 0;
      mobileInput.lookY = 0;
      isLookingRef.current = true;
    }

    const forward =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
      (keys.KeyS || keys.ArrowDown ? 1 : 0) +
      mobileInput.y;
    const strafe =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
      (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
      mobileInput.x;

    const clampedForward = THREE.MathUtils.clamp(forward, -1, 1);
    const clampedStrafe = THREE.MathUtils.clamp(strafe, -1, 1);
    const moveMag = Math.hypot(clampedForward, clampedStrafe);

    let moving = false;
    const sprinting = !!(
      keys.ShiftLeft ||
      keys.ShiftRight ||
      mobileInput.sprint
    );
    if (moveMag > 0.08) {
      moving = true;
      const yaw = cameraYawRef.current;
      camForward.set(Math.sin(yaw), 0, Math.cos(yaw));
      camRight.set(-Math.cos(yaw), 0, Math.sin(yaw));
      moveDir.set(0, 0, 0);
      moveDir.addScaledVector(camForward, clampedForward);
      moveDir.addScaledVector(camRight, clampedStrafe);
      if (moveDir.lengthSq() > 0) moveDir.normalize();

      const analog = Math.min(1, moveMag);
      const speed =
        MOVE_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1) * analog;
      positionRef.current.x += moveDir.x * speed * delta;
      positionRef.current.z += moveDir.z * speed * delta;
      // Smooth turn toward move direction — no snap when WASD changes.
      const facing = Math.atan2(moveDir.x, moveDir.z);
      rotationRef.current = lerpAngle(
        rotationRef.current,
        facing,
        1 - Math.exp(-TURN_SPEED * delta),
      );
    } else if (!inEmote && !isLookingRef.current && !seated) {
      rotationRef.current = lerpAngle(
        rotationRef.current,
        cameraYawRef.current,
        1 - Math.exp(-TURN_SPEED * 0.7 * delta),
      );
    }

    positionRef.current.x = THREE.MathUtils.clamp(
      positionRef.current.x,
      CLUB_BOUNDS.minX,
      CLUB_BOUNDS.maxX,
    );
    positionRef.current.z = THREE.MathUtils.clamp(
      positionRef.current.z,
      CLUB_BOUNDS.minZ,
      CLUB_BOUNDS.maxZ,
    );

    // While seated (and not trying to move), rest pose is sit/chill.
    const seatedPose = isLoungeSeat(localSeat)
      ? "chill"
      : isVoiceSeat(localSeat)
        ? "sit"
        : "idle";
    const locomotion = moving ? "walk" : seated ? seatedPose : "idle";
    if (!inEmote && anim !== locomotion) {
      setAnim(locomotion);
    }

    const zone = getZoneAt(positionRef.current.x, positionRef.current.z);
    const zoneId = zone?.id ?? null;
    if (zoneId !== lastZoneRef.current) {
      lastZoneRef.current = zoneId;
      setCurrentZone(zone);
      onZoneChange(zone);
    }

    onPositionUpdate(positionRef.current.x, positionRef.current.z);

    const group = groupRef.current;
    if (group) {
      group.position.copy(positionRef.current);
      // Lift onto the couch cushion so sitting is obvious from third person.
      group.position.y = isLoungeSeat(localSeat) ? 0.28 : 0;
      group.rotation.y = rotationRef.current;
    }

    const marker = markerRef.current;
    if (marker) {
      const pulse = 1 + Math.sin(_state.clock.elapsedTime * 3.2) * 0.05;
      marker.scale.set(pulse, pulse, 1);
    }

    cameraTarget.set(
      positionRef.current.x,
      positionRef.current.y,
      positionRef.current.z,
    );

    if (!sessionId) {
      return;
    }

    // Seated players stop sending moves — a move message would stand them up
    // server-side. Pressing WASD resumes moves, which unseats them.
    if (seated && !moving) {
      return;
    }

    const now = performance.now();
    if (now - lastSentRef.current > 66) {
      lastSentRef.current = now;
      onMove({
        x: positionRef.current.x,
        y: 0,
        z: positionRef.current.z,
        rotY: rotationRef.current,
        anim: inEmote ? "idle" : moving ? "walk" : "idle",
      });
    }
  });

  const spotlightZone =
    currentZone?.id === "dancefloor" || currentZone?.id === "dj";

  return (
    <>
      <MouseLookControls
        yawRef={cameraYawRef}
        pitchRef={cameraPitchRef}
        rotationRef={rotationRef}
        isLookingRef={isLookingRef}
        onMouseLookChange={onMouseLookChange}
      />
      <CameraRig
        target={cameraTarget}
        yawRef={cameraYawRef}
        pitchRef={cameraPitchRef}
      />
      <FollowSpotlight target={cameraTarget} active={spotlightZone} />
      <group ref={groupRef}>
        <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.55, 0.72, 32]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.12, -0.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 0.55, 4]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.75} />
        </mesh>
        <Avatar
          name={localPlayer?.name ?? localName}
          outfit={
            localPlayer
              ? {
                  gender: localPlayer.gender,
                  color: localPlayer.color,
                  shirt: localPlayer.shirt,
                  pants: localPlayer.pants,
                  shoes: localPlayer.shoes,
                  style: localPlayer.style,
                }
              : localOutfit
          }
          anim={anim}
          chat={localPlayer?.chat}
          glowBoost={currentZone?.id === "vip" || glowBuffActive}
          speaking={sessionId ? speakingIds.has(sessionId) : false}
          isLocal
        />
      </group>
    </>
  );
}

function RemotePlayers({
  sessionId,
  players,
  liveTargets,
  speakingIds,
}: {
  sessionId: string | null;
  players: PlayerSnapshot[];
  liveTargets: Map<string, LiveTarget>;
  speakingIds: Set<string>;
}) {
  return (
    <>
      {players
        .filter((player) => player.sessionId !== sessionId)
        .map((player) => (
          <Avatar
            key={player.sessionId}
            name={player.name}
            outfit={{
              gender: player.gender,
              color: player.color,
              shirt: player.shirt,
              pants: player.pants,
              shoes: player.shoes,
              style: player.style,
            }}
            anim={player.anim}
            chat={player.chat}
            position={[player.x, player.y, player.z]}
            rotationY={player.rotY}
            liveTarget={liveTargets.get(player.sessionId)}
            speaking={speakingIds.has(player.sessionId)}
          />
        ))}
    </>
  );
}

function SceneContent(props: SceneProps) {
  const dropActive = props.dropUntil > Date.now();
  const partyActive = props.partyUntil > Date.now();
  const djActive = Boolean(props.djMode);
  const boosted = dropActive || partyActive || props.djMode === "hyper";

  const djAccent =
    props.djMode === "bass"
      ? "#f472b6"
      : props.djMode === "chill"
        ? "#22d3ee"
        : props.djMode === "hyper"
          ? "#fbbf24"
          : "#f472b6";

  return (
    <>
      <color attach="background" args={["#0c0c18"]} />
      <fog attach="fog" args={["#0c0c18", 28, 75]} />
      <ambientLight intensity={boosted ? 0.85 : djActive ? 0.7 : 0.62} />
      <hemisphereLight
        args={[
          props.djMode === "chill" ? "#a5f3fc" : "#c4b5fd",
          "#1e1b4b",
          0.7,
        ]}
      />
      <directionalLight
        castShadow={false}
        intensity={props.djMode === "bass" ? 0.85 : 1}
        position={[0, 16, 8]}
      />
      <pointLight
        position={[0, 6, -10]}
        intensity={props.djMode === "bass" ? 32 : props.djMode === "hyper" ? 28 : 20}
        color={djAccent}
        distance={35}
        decay={2}
      />
      <pointLight position={[-18, 5, 2]} intensity={12} color="#22d3ee" distance={20} decay={2} />
      <pointLight position={[18, 5, -4]} intensity={12} color="#fbbf24" distance={20} decay={2} />
      {props.djMode === "hyper" ? (
        <pointLight position={[0, 8, 0]} intensity={18} color="#a78bfa" distance={26} decay={2} />
      ) : null}

      <ClubEnvironment
        dropActive={dropActive}
        partyActive={partyActive || props.djMode === "hyper"}
        djMode={props.djMode}
      />
      <ClubCollectibles collectedIds={props.collectedTokenIds} />
      <ZoneLabels />
      <InteractiveZones />
      <VoiceSeats
        players={props.players}
        localSeat={
          props.players.find((p) => p.sessionId === props.sessionId)?.seat ?? -1
        }
        onSit={props.onSit}
      />
      <PhotoFlashes flashes={props.photoFlashes} />
      <Confetti boost={boosted} />

      <LocalController {...props} />
      <RemotePlayers
        sessionId={props.sessionId}
        players={props.players}
        liveTargets={props.liveTargets}
        speakingIds={props.speakingIds}
      />

      <AdaptiveDpr pixelated />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={
            props.djMode === "bass"
              ? 0.55
              : props.djMode === "hyper"
                ? 0.65
                : 0.4
          }
          luminanceThreshold={0.35}
          luminanceSmoothing={0.5}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={0.3} />
      </EffectComposer>
    </>
  );
}

export function ConcertScene(props: SceneProps) {
  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, 5, 12], fov: 68 }}
      // Cap pixel ratio hard — retina at full DPR is the #1 smoothness killer here.
      dpr={[1, 1.25]}
      gl={{
        powerPreference: "high-performance",
        antialias: false,
        stencil: false,
        depth: true,
      }}
      style={{ width: "100%", height: "100%", cursor: "grab" }}
      onCreated={({ gl }) => {
        gl.domElement.tabIndex = 0;
        gl.domElement.focus();
        const cap = isCoarsePointer() ? 1 : 1.25;
        gl.setPixelRatio(Math.min(window.devicePixelRatio, cap));
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
