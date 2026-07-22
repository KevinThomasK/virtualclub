"use client";

import { useMemo, useRef } from "react";
import { Html, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AnimState } from "@/lib/types";
import type { LiveTarget } from "@/hooks/useConcertRoom";
import {
  getOutfitColors,
  type AvatarOutfit,
} from "@/lib/avatarCatalog";

/** Lerp between angles along the shortest arc (avoids full spins at ±π). */
function lerpAngle(from: number, to: number, t: number) {
  const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  return from + delta * t;
}

type AvatarProps = {
  name: string;
  outfit: AvatarOutfit;
  anim: AnimState;
  chat?: string;
  position?: [number, number, number];
  rotationY?: number;
  isLocal?: boolean;
  /** Mutable target updated on every server patch — read per frame, no re-render needed. */
  liveTarget?: LiveTarget;
  targetPosition?: THREE.Vector3;
  targetRotationY?: number;
  glowBoost?: boolean;
  preview?: boolean;
  showNameTag?: boolean;
  speaking?: boolean;
};

/** Fabric vs. tech material feel, driven by the chosen overall style. */
function getStyleMaterial(style: AvatarOutfit["style"]) {
  switch (style) {
    case "rave":
      return { roughness: 0.25, metalness: 0.7 };
    case "elegant":
      return { roughness: 0.55, metalness: 0.12 };
    case "street":
    default:
      return { roughness: 0.8, metalness: 0.04 };
  }
}

function ProceduralAvatar({
  name,
  outfit,
  anim,
  chat = "",
  position = [0, 0, 0],
  rotationY = 0,
  isLocal = false,
  liveTarget,
  targetPosition,
  targetRotationY,
  glowBoost = false,
  preview = false,
  showNameTag = true,
  speaking = false,
}: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const glowMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const colors = useMemo(() => getOutfitColors(outfit), [outfit]);
  const baseColor = useMemo(() => new THREE.Color(colors.accent), [colors.accent]);
  const neonAccent = useMemo(
    () => baseColor.clone().offsetHSL(0, 0.2, 0.2),
    [baseColor],
  );
  const material = useMemo(() => getStyleMaterial(outfit.style), [outfit.style]);

  const isDress = outfit.shirt === "glitter-dress";
  const isCropTop = outfit.shirt === "crop-top";
  const isBomber = outfit.shirt === "bomber";
  const isRave = outfit.style === "rave";
  const isCyber = outfit.style === "cyber";
  const isElegant = outfit.style === "elegant";
  const isFemale = outfit.gender === "female";
  const showHalo = outfit.style !== "street";
  const raveStyle = isRave || isCyber || glowBoost;
  const techHead = isRave || isCyber;
  const legColor = isDress ? colors.shirt : colors.pants;

  // Body proportions per gender: male reads broad-shouldered and blocky,
  // female reads slimmer with narrower shoulders and wider hips.
  const shoulderX = isFemale ? 0.31 : 0.38;
  const shoulderRadius = isFemale ? 0.075 : 0.1;
  const armRadius = isFemale ? 0.062 : 0.08;
  const legRadius = isFemale ? 0.06 : 0.078;
  const legX = isFemale ? 0.13 : 0.18;
  const torsoRadius = (isBomber ? 0.34 : 0.3) * (isFemale ? 0.78 : 1.08);
  const bodyScale = isFemale ? 0.96 : 1.04;

  // Dress hem sits low enough to cover the upper legs entirely — only
  // ankles/shoes peek out, so there's no "robot legs through the skirt" look.
  const legLength = isDress ? 0.16 : 0.45;
  const legY = isDress ? 0.24 : 0.4;

  const scratchTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!isLocal && liveTarget) {
      scratchTarget.set(liveTarget.x, liveTarget.y, liveTarget.z);
      // Teleports (e.g. sitting on a stool) snap; normal movement lerps.
      if (group.position.distanceToSquared(scratchTarget) > 64) {
        group.position.copy(scratchTarget);
        group.rotation.y = liveTarget.rotY;
      } else {
      group.position.lerp(scratchTarget, Math.min(1, delta * 10));
        group.rotation.y = lerpAngle(
          group.rotation.y,
          liveTarget.rotY,
          Math.min(1, delta * 10),
        );
      }
    } else if (!isLocal && targetPosition) {
      group.position.lerp(targetPosition, Math.min(1, delta * 12));
      if (targetRotationY !== undefined) {
        group.rotation.y = lerpAngle(
          group.rotation.y,
          targetRotationY,
          Math.min(1, delta * 12),
        );
      }
    } else if (!isLocal) {
      group.position.set(position[0], position[1], position[2]);
      group.rotation.y = rotationY;
    }

    const t = state.clock.elapsedTime;
    const leftArm = leftArmRef.current;
    const rightArm = rightArmRef.current;
    const leftLeg = leftLegRef.current;
    const rightLeg = rightLegRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    const halo = haloRef.current;
    const ring = ringRef.current;
    const glowMat = glowMatRef.current;

    if (!leftArm || !rightArm || !leftLeg || !rightLeg || !body || !head) return;

    const floatY = Math.sin(t * 2.5) * 0.04;
    const blend = Math.min(1, delta * 10);

    const resetLegs = () => {
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, blend);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, blend);
    };

    const resetBodyTwist = () => {
      body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, blend);
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0, blend);
    };

    if (halo) {
      halo.rotation.z += delta * 1.5;
      halo.rotation.x = Math.sin(t * 2) * 0.2;
      const haloBaseY = preview ? 2.05 : 2.2;
      halo.position.y = haloBaseY + Math.sin(t * 3) * 0.05;
    }

    if (ring) {
      ring.rotation.z -= delta * 0.5;
      const pulse = 0.8 + Math.sin(t * 4) * 0.2;
      ring.scale.setScalar(pulse);
    }

    if (anim === "sit" || anim === "chill") {
      // Seated: body lowered onto furniture. Chill adds a sip-drink arm loop.
      const hipY = anim === "chill" ? 0.78 : 0.62;
      const headY = anim === "chill" ? 1.55 : 1.42;
      body.position.y = THREE.MathUtils.lerp(body.position.y, hipY, blend);
      head.position.y = THREE.MathUtils.lerp(head.position.y, headY, blend);
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -1.35, blend);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, -1.35, blend);
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.35, blend);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.15, blend);

      if (anim === "chill") {
        // Slow sip: raise glass toward face, then rest on the knee.
        const sip = (Math.sin(t * 1.1) * 0.5 + 0.5) ** 1.6;
        rightArm.rotation.x = THREE.MathUtils.lerp(-0.45, -1.55, sip);
        rightArm.rotation.z = THREE.MathUtils.lerp(-0.15, 0.35, sip);
        head.rotation.z = Math.sin(t * 0.8) * 0.05 - sip * 0.08;
      } else {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.35, blend);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.1, blend);
        head.rotation.z = Math.sin(t * 1.5) * 0.04;
      }
      body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, blend);
      return;
    }

    if (anim === "wave") {
      body.position.y = 0.95 + floatY;
      head.position.y = 1.75 + floatY;
      rightArm.rotation.x = -1.1;
      rightArm.rotation.z = Math.sin(t * 12) * 0.55 - 0.15;
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.15, blend);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, blend);
      resetLegs();
      resetBodyTwist();
      return;
    }

    if (anim === "cheer") {
      body.position.y = 0.95 + Math.abs(Math.sin(t * 10)) * 0.14;
      head.position.y = 1.75 + Math.abs(Math.sin(t * 10)) * 0.06;
      leftArm.rotation.x = -2.5;
      rightArm.rotation.x = -2.5;
      leftArm.rotation.z = -0.45;
      rightArm.rotation.z = 0.45;
      leftLeg.rotation.x = Math.sin(t * 12) * 0.35;
      rightLeg.rotation.x = -Math.sin(t * 12) * 0.35;
      body.rotation.y = Math.sin(t * 8) * 0.08;
      if (glowMat) glowMat.emissiveIntensity = 0.9 + Math.sin(t * 8) * 0.35;
      return;
    }

    if (anim === "pose") {
      body.position.y = 0.95 + floatY * 0.5;
      head.position.y = 1.75;
      head.rotation.z = 0.15;
      leftArm.rotation.x = -0.55;
      leftArm.rotation.z = 0.65;
      rightArm.rotation.x = -1.35;
      rightArm.rotation.z = -0.2;
      resetLegs();
      body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0.05, blend);
      return;
    }

    if (anim === "dance") {
      const hue = (t * 0.55) % 1;
      if (glowMat) glowMat.emissive.setHSL(hue, 1, 0.5);

      body.position.y = 0.95 + Math.sin(t * 12) * 0.14;
      head.position.y = 1.75 + Math.sin(t * 12 + 0.3) * 0.1;
      head.rotation.z = Math.sin(t * 8) * 0.3;
      body.rotation.y = Math.sin(t * 6) * 0.22;

      leftArm.rotation.x = Math.sin(t * 14) * 1.35 - 0.5;
      rightArm.rotation.x = Math.cos(t * 14) * 1.35 - 0.5;
      leftArm.rotation.z = 0.45 + Math.sin(t * 10) * 0.45;
      rightArm.rotation.z = -0.45 - Math.cos(t * 10) * 0.45;

      leftLeg.rotation.x = Math.sin(t * 14 + Math.PI) * 0.75;
      rightLeg.rotation.x = Math.sin(t * 14) * 0.75;
      return;
    }

    if (glowMat) {
      glowMat.emissive.copy(baseColor).multiplyScalar(raveStyle ? 0.4 : 0.15);
    }

    body.position.y = THREE.MathUtils.lerp(body.position.y, 0.95 + floatY, delta * 8);
    head.position.y = THREE.MathUtils.lerp(head.position.y, 1.75 + floatY * 1.2, delta * 8);
    resetBodyTwist();

    leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, delta * 8);
    rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0, delta * 8);
    leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, delta * 8);
    rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, delta * 8);

    leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, delta * 8);
    rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, delta * 8);

    if (anim === "walk") {
      const swing = Math.sin(t * 9);
      leftArm.rotation.x = swing * 0.45;
      rightArm.rotation.x = -swing * 0.45;
      leftLeg.rotation.x = -swing * 0.55;
      rightLeg.rotation.x = swing * 0.55;
      body.position.y = 0.95 + Math.abs(Math.sin(t * 9)) * 0.035;
      head.position.y = 1.75 + Math.abs(Math.sin(t * 9)) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Floor target ring */}
      <group ref={ringRef} position={[0, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={isLocal ? 0.8 : 0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 16]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={isLocal ? 0.5 : 0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.65, 32]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <Sparkles
        count={raveStyle ? 28 : 15}
        scale={[1.2, preview ? 1.5 : 2, 1.2]}
        position={[0, preview ? 0.95 : 1, 0]}
        size={isLocal ? 3 : 1.5}
        speed={raveStyle ? 0.8 : 0.4}
        color={colors.accent}
      />

      {showHalo ? (
        <mesh ref={haloRef} position={[0, preview ? 2.05 : 2.2, 0]}>
          <torusGeometry args={[0.22, 0.02, 16, 32]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={isElegant ? 1.2 : 2}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {/* Legs — shortened and tucked under a dress hem instead of poking through it */}
      <mesh ref={leftLegRef} castShadow position={[-legX, legY, 0]}>
        <capsuleGeometry args={[legRadius, legLength, 8, 16]} />
        <meshStandardMaterial color={legColor} roughness={material.roughness} metalness={material.metalness * 0.6} />
      </mesh>
      <mesh ref={rightLegRef} castShadow position={[legX, legY, 0]}>
        <capsuleGeometry args={[legRadius, legLength, 8, 16]} />
        <meshStandardMaterial color={legColor} roughness={material.roughness} metalness={material.metalness * 0.6} />
      </mesh>

      <mesh castShadow position={[-legX, 0.08, 0.05]}>
        <boxGeometry args={[isFemale ? 0.1 : 0.13, 0.08, isFemale ? 0.2 : 0.23]} />
        <meshStandardMaterial
          color={colors.shoes}
          emissive={outfit.shoes === "glow-runners" ? colors.accent : "#000000"}
          emissiveIntensity={outfit.shoes === "glow-runners" ? 1.5 : 0}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
      <mesh castShadow position={[legX, 0.08, 0.05]}>
        <boxGeometry args={[isFemale ? 0.1 : 0.13, 0.08, isFemale ? 0.2 : 0.23]} />
        <meshStandardMaterial
          color={colors.shoes}
          emissive={outfit.shoes === "glow-runners" ? colors.accent : "#000000"}
          emissiveIntensity={outfit.shoes === "glow-runners" ? 1.5 : 0}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>

      {/* Body — the shape itself now depends on the outfit, not just an add-on */}
      <group ref={bodyRef} position={[0, 0.95, 0]}>
        {isDress ? (
          <>
            {/* fitted bodice, sized to the torso — no oversized ball poking above the skirt */}
            <mesh castShadow position={[0, 0.18, 0]}>
              <capsuleGeometry args={[0.22, 0.28, 12, 24]} />
              <meshStandardMaterial
                ref={glowMatRef}
                color={colors.shirt}
                roughness={material.roughness}
                metalness={material.metalness}
                emissive={baseColor}
                emissiveIntensity={isRave ? 0.5 : 0.15}
              />
            </mesh>
            {/* skirt flares from the waist and its hem covers the legs down to the ankle */}
            <mesh castShadow position={[0, -0.42, 0]}>
              <coneGeometry args={[0.4, 0.65, 24]} />
              <meshStandardMaterial
                color={colors.shirt}
                emissive={colors.accent}
                emissiveIntensity={0.15}
                roughness={material.roughness}
                metalness={material.metalness * 0.5}
              />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[0, isCropTop ? 0.22 : 0, 0]}>
              <capsuleGeometry
                args={[torsoRadius, (isCropTop ? 0.32 : 0.7) * bodyScale, 12, 24]}
              />
              <meshStandardMaterial
                ref={glowMatRef}
                color={colors.shirt}
                roughness={material.roughness}
                metalness={material.metalness}
                emissive={baseColor}
                emissiveIntensity={isRave ? 0.55 : 0.15}
              />
            </mesh>
            {isFemale ? (
              // Hip flare gives the female silhouette an hourglass read.
              <mesh castShadow position={[0, -0.34, 0]}>
                <sphereGeometry args={[0.27, 16, 16]} />
                <meshStandardMaterial
                  color={colors.pants}
                  roughness={material.roughness}
                  metalness={material.metalness * 0.6}
                />
              </mesh>
            ) : null}
          </>
        )}
        {/* crop-top ends above the waist on purpose — the bare gap before the
            legs start is the look, so no extra geometry is added there. */}

        <mesh position={[0, 0.1, 0.22]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={neonAccent}
            emissive={colors.accent}
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Head — only the rave style gets the full cyber helmet; other styles get a plain head + hair */}
      <group ref={headRef} position={[0, 1.75, 0]}>
        {techHead ? (
          <>
            <mesh castShadow>
              <sphereGeometry args={[0.26, 24, 24]} />
              <meshStandardMaterial color="#0d0e12" roughness={0.1} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0.02, 0.16]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.36, 0.12, 0.18]} />
              <meshStandardMaterial
                color={colors.accent}
                emissive={colors.accent}
                emissiveIntensity={2.5}
                roughness={0.1}
                metalness={0.9}
                toneMapped={false}
              />
            </mesh>
            {isCyber ? (
              <mesh position={[0, 0.28, 0]}>
                <torusGeometry args={[0.18, 0.015, 12, 32]} />
                <meshStandardMaterial
                  color={colors.accent}
                  emissive={colors.accent}
                  emissiveIntensity={2}
                  toneMapped={false}
                />
              </mesh>
            ) : null}
            <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
              <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={1} />
            </mesh>
            <mesh position={[0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
              <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={1} />
            </mesh>
            {isFemale ? (
              // Glowing ponytail out the back of the helmet
              <mesh position={[0, 0.02, -0.3]} rotation={[0.6, 0, 0]}>
                <capsuleGeometry args={[0.06, 0.42, 8, 12]} />
                <meshStandardMaterial
                  color={colors.accent}
                  emissive={colors.accent}
                  emissiveIntensity={1.2}
                  roughness={0.3}
                  toneMapped={false}
                />
              </mesh>
            ) : null}
          </>
        ) : (
          <>
            <mesh castShadow>
              <sphereGeometry args={[0.26, 24, 24]} />
              <meshStandardMaterial color="#f2c9a1" roughness={0.7} metalness={0} />
            </mesh>
            {/* hair cap — a flattened upper hemisphere instead of a full helmet */}
            <mesh position={[0, 0.07, -0.01]} scale={[1.05, 0.62, 1.05]}>
              <sphereGeometry args={[0.27, 20, 20, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              <meshStandardMaterial
                color={isElegant ? "#241c14" : colors.accent}
                roughness={0.55}
                metalness={0}
              />
            </mesh>
            {isFemale ? (
              <>
                {/* Long hair falling behind the head to the shoulders */}
                <mesh position={[0, -0.14, -0.13]} scale={[0.95, 1.7, 0.6]}>
                  <sphereGeometry args={[0.24, 16, 16]} />
                  <meshStandardMaterial
                    color={isElegant ? "#241c14" : colors.accent}
                    roughness={0.55}
                    metalness={0}
                  />
                </mesh>
                {/* Side strands framing the face */}
                <mesh position={[-0.22, -0.08, 0.03]} scale={[0.35, 1.3, 0.5]}>
                  <sphereGeometry args={[0.14, 12, 12]} />
                  <meshStandardMaterial
                    color={isElegant ? "#241c14" : colors.accent}
                    roughness={0.55}
                    metalness={0}
                  />
                </mesh>
                <mesh position={[0.22, -0.08, 0.03]} scale={[0.35, 1.3, 0.5]}>
                  <sphereGeometry args={[0.14, 12, 12]} />
                  <meshStandardMaterial
                    color={isElegant ? "#241c14" : colors.accent}
                    roughness={0.55}
                    metalness={0}
                  />
                </mesh>
              </>
            ) : null}
            {outfit.style === "street" ? (
              <mesh position={[0, 0.01, 0.19]}>
                <boxGeometry args={[0.3, 0.07, 0.03]} />
                <meshStandardMaterial color="#111318" roughness={0.2} metalness={0.3} />
              </mesh>
            ) : null}
          </>
        )}
      </group>

      {/* Arms — pulled in closer to the torso and given a shoulder joint so they read as attached */}
      <group ref={leftArmRef} position={[-shoulderX, 1.2, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[shoulderRadius, 16, 16]} />
          <meshStandardMaterial color={colors.shirt} roughness={material.roughness} metalness={material.metalness} />
        </mesh>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[armRadius, 0.32, 8, 16]} />
          <meshStandardMaterial
            color={isRave ? "#1a1c23" : colors.shirt}
            roughness={material.roughness}
            metalness={isRave || isCyber ? 0.6 : material.metalness}
          />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={isRave || isCyber ? 1.5 : 0.4} toneMapped={false} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[shoulderX, 1.2, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[shoulderRadius, 16, 16]} />
          <meshStandardMaterial color={colors.shirt} roughness={material.roughness} metalness={material.metalness} />
        </mesh>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[armRadius, 0.32, 8, 16]} />
          <meshStandardMaterial
            color={isRave ? "#1a1c23" : colors.shirt}
            roughness={material.roughness}
            metalness={isRave || isCyber ? 0.6 : material.metalness}
          />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={isRave || isCyber ? 1.5 : 0.4} toneMapped={false} />
        </mesh>
        {anim === "chill" ? (
          <group position={[0.02, -0.52, 0.06]} rotation={[0.4, 0, 0.2]}>
            <mesh>
              <cylinderGeometry args={[0.06, 0.045, 0.16, 12]} />
              <meshStandardMaterial
                color="#67e8f9"
                emissive="#22d3ee"
                emissiveIntensity={2.2}
                transparent
                opacity={0.9}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.09, 8]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.05, 0]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshStandardMaterial
                color="#a78bfa"
                emissive="#a78bfa"
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </mesh>
            <pointLight position={[0, 0.05, 0]} intensity={4} color="#67e8f9" distance={2.2} />
          </group>
        ) : null}
      </group>

      {showNameTag ? (
        <Html
          position={[0, preview ? 2.35 : 2.55, 0]}
        center
        distanceFactor={preview ? 14 : 10}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          padding: preview ? "4px 10px" : "5px 14px",
          borderRadius: "6px",
          background: "rgba(10, 11, 16, 0.85)",
          backdropFilter: "blur(8px)",
          borderLeft: `3px solid ${isLocal ? "#818cf8" : colors.accent}`,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          boxShadow: isLocal
            ? "0 0 20px rgba(129, 140, 248, 0.4)"
            : "0 4px 20px rgba(0,0,0,0.5)",
          color: "#fff",
          fontSize: preview ? "11px" : "12px",
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: isLocal ? "#818cf8" : colors.accent,
            boxShadow: `0 0 8px ${isLocal ? "#818cf8" : colors.accent}`,
          }}
        />
        {name.toUpperCase()}
        </Html>
      ) : null}

      {speaking ? (
        <Html
          position={[0, anim === "sit" || anim === "chill" ? 2.35 : 2.85, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: "none",
            userSelect: "none",
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.9)",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            boxShadow: "0 0 14px rgba(16, 185, 129, 0.9)",
          }}
        >
          🎙️
        </Html>
      ) : null}

      {chat ? (
        <Html
          position={[0, 2.95, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: "none",
            userSelect: "none",
            maxWidth: 180,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.92)",
            color: "#0f172a",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {chat}
        </Html>
      ) : null}
    </group>
  );
}

export function Avatar(props: AvatarProps) {
  return <ProceduralAvatar {...props} />;
}