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
      return { roughness: 0.18, metalness: 0.85 };
    case "cyber":
      return { roughness: 0.12, metalness: 0.95 };
    case "elegant":
      return { roughness: 0.45, metalness: 0.2 };
    case "street":
    default:
      return { roughness: 0.82, metalness: 0.05 };
  }
}

const SKIN = "#f2c9a1";

function ShoePair({
  shoeId,
  color,
  accent,
  legX,
  isFemale,
}: {
  shoeId: string;
  color: string;
  accent: string;
  legX: number;
  isFemale: boolean;
}) {
  const baseW = isFemale ? 0.1 : 0.13;

  const makeShoe = (x: number) => {
    if (shoeId === "boots") {
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.2, 0.02]}>
            <boxGeometry args={[baseW * 1.05, 0.32, 0.2]} />
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh castShadow position={[0, 0.05, 0.08]}>
            <boxGeometry args={[baseW * 1.1, 0.08, 0.28]} />
            <meshStandardMaterial color="#1c1917" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
      );
    }
    if (shoeId === "high-tops") {
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.14, 0.04]}>
            <boxGeometry args={[baseW, 0.2, 0.22]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.04, 0.06]}>
            <boxGeometry args={[baseW * 1.05, 0.05, 0.26]} />
            <meshStandardMaterial color="#0f172a" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.18, 0.15]}>
            <boxGeometry args={[baseW * 0.7, 0.04, 0.04]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} toneMapped={false} />
          </mesh>
        </group>
      );
    }
    if (shoeId === "platforms") {
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.16, 0.05]}>
            <boxGeometry args={[baseW * 0.95, 0.1, 0.22]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.35}
              roughness={0.3}
              metalness={0.4}
              toneMapped={false}
            />
          </mesh>
          <mesh castShadow position={[0, 0.06, 0.04]}>
            <boxGeometry args={[baseW * 1.05, 0.12, 0.24]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      );
    }
    if (shoeId === "sliders") {
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.04, 0.06]}>
            <boxGeometry args={[baseW * 1.05, 0.04, 0.24]} />
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.08, 0.02]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[baseW * 0.85, 0.03, 0.1]} />
            <meshStandardMaterial color={accent} roughness={0.4} />
          </mesh>
        </group>
      );
    }
    if (shoeId === "glow-runners") {
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.1, 0.05]}>
            <boxGeometry args={[baseW, 0.1, 0.24]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.04, 0.05]}>
            <boxGeometry args={[baseW * 1.08, 0.05, 0.26]} />
            <meshStandardMaterial
              color={color}
              emissive={accent}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        </group>
      );
    }
    // sneakers (default)
    return (
      <group key={x} position={[x, 0, 0]}>
        <mesh castShadow position={[0, 0.09, 0.05]}>
          <boxGeometry args={[baseW, 0.09, 0.23]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.04, 0.05]}>
          <boxGeometry args={[baseW * 1.06, 0.04, 0.25]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      </group>
    );
  };

  return (
    <>
      {makeShoe(-legX)}
      {makeShoe(legX)}
    </>
  );
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
  const isJacket = outfit.shirt === "neon-jacket";
  const isHoodie = outfit.shirt === "hoodie";
  const isMeshTank = outfit.shirt === "mesh-tank";
  const isRave = outfit.style === "rave";
  const isCyber = outfit.style === "cyber";
  const isElegant = outfit.style === "elegant";
  const isStreet = outfit.style === "street";
  const isFemale = outfit.gender === "female";
  const showHalo = isCyber || isRave || isElegant;
  const raveStyle = isRave || isCyber || glowBoost;
  const techHead = isRave || isCyber;
  const sleeveless = isMeshTank || isCropTop;
  const legColor = isDress ? colors.shirt : colors.pants;

  const isShorts = outfit.pants === "shorts";
  const isSkinny = outfit.pants === "skinny";
  const isWideLeg = outfit.pants === "wide-leg";
  const isCargo = outfit.pants === "cargo";
  const isLeather = outfit.pants === "leather";
  const isJoggers = outfit.pants === "joggers";

  // Body proportions per gender: male reads broad-shouldered and blocky,
  // female reads slimmer with narrower shoulders and wider hips.
  const shoulderX = isFemale ? 0.31 : 0.38;
  const shoulderRadius = isFemale
    ? isJacket || isHoodie
      ? 0.1
      : 0.075
    : isJacket || isHoodie
      ? 0.13
      : 0.1;
  const armRadius = isFemale ? 0.062 : 0.08;
  const legRadius =
    (isSkinny ? 0.048 : isWideLeg ? 0.1 : isCargo ? 0.085 : 0.07) *
    (isFemale ? 0.9 : 1.05);
  const legX = isWideLeg ? (isFemale ? 0.16 : 0.2) : isFemale ? 0.13 : 0.18;
  const torsoRadius =
    (isJacket || isHoodie ? 0.36 : isBomber ? 0.34 : isMeshTank ? 0.26 : 0.3) *
    (isFemale ? 0.78 : 1.08);
  const bodyScale = isFemale ? 0.96 : 1.04;

  // Dress / shorts change how much leg shows.
  const legLength = isDress ? 0.16 : 0.45;
  const legY = isDress ? 0.24 : 0.4;
  const pantsMetal = isLeather ? 0.75 : material.metalness * 0.6;
  const pantsRough = isLeather ? 0.18 : isJoggers ? 0.9 : material.roughness;
  const armClothColor = sleeveless ? SKIN : colors.shirt;
  // Shorts use skin-colored full legs + a short overlay so walk anim still works.
  const animatedLegColor = isShorts && !isDress ? SKIN : legColor;

  const scratchTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!isLocal && liveTarget) {
      scratchTarget.set(liveTarget.x, liveTarget.y, liveTarget.z);
      // Teleports (e.g. sitting on a stool) snap; normal movement damps smoothly.
      if (group.position.distanceToSquared(scratchTarget) > 64) {
        group.position.copy(scratchTarget);
        group.rotation.y = liveTarget.rotY;
      } else {
        const blend = 1 - Math.exp(-18 * delta);
        group.position.lerp(scratchTarget, blend);
        group.rotation.y = lerpAngle(group.rotation.y, liveTarget.rotY, blend);
      }
    } else if (!isLocal && targetPosition) {
      const blend = 1 - Math.exp(-18 * delta);
      group.position.lerp(targetPosition, blend);
      if (targetRotationY !== undefined) {
        group.rotation.y = lerpAngle(group.rotation.y, targetRotationY, blend);
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
        count={isLocal ? (isRave ? 22 : isCyber ? 14 : 8) : 0}
        scale={[1.2, preview ? 1.5 : 2, 1.2]}
        position={[0, preview ? 0.95 : 1, 0]}
        size={isLocal ? 2.5 : 1}
        speed={isRave ? 0.9 : 0.4}
        color={isElegant ? "#e9d5ff" : colors.accent}
      />

      {showHalo ? (
        <mesh ref={haloRef} position={[0, preview ? 2.05 : 2.2, 0]}>
          <torusGeometry args={[isElegant ? 0.18 : 0.22, isElegant ? 0.012 : 0.02, 16, 32]} />
          <meshStandardMaterial
            color={isElegant ? "#e9d5ff" : colors.accent}
            emissive={isElegant ? "#c4b5fd" : colors.accent}
            emissiveIntensity={isElegant ? 0.9 : 2}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {/* Legs — silhouette changes with pants style */}
      <mesh ref={leftLegRef} castShadow position={[-legX, legY, 0]}>
        <capsuleGeometry args={[legRadius, legLength, 8, 16]} />
        <meshStandardMaterial
          color={animatedLegColor}
          roughness={isShorts ? 0.75 : pantsRough}
          metalness={isShorts ? 0 : pantsMetal}
        />
      </mesh>
      <mesh ref={rightLegRef} castShadow position={[legX, legY, 0]}>
        <capsuleGeometry args={[legRadius, legLength, 8, 16]} />
        <meshStandardMaterial
          color={animatedLegColor}
          roughness={isShorts ? 0.75 : pantsRough}
          metalness={isShorts ? 0 : pantsMetal}
        />
      </mesh>

      {/* Shorts overlay on thighs */}
      {isShorts && !isDress ? (
        <>
          <mesh position={[-legX, 0.62, 0]}>
            <capsuleGeometry args={[legRadius * 1.15, 0.18, 6, 12]} />
            <meshStandardMaterial color={colors.pants} roughness={0.55} metalness={0.2} />
          </mesh>
          <mesh position={[legX, 0.62, 0]}>
            <capsuleGeometry args={[legRadius * 1.15, 0.18, 6, 12]} />
            <meshStandardMaterial color={colors.pants} roughness={0.55} metalness={0.2} />
          </mesh>
        </>
      ) : null}

      {/* Cargo pockets */}
      {isCargo && !isDress ? (
        <>
          <mesh position={[-legX - 0.06, 0.55, 0.06]}>
            <boxGeometry args={[0.08, 0.12, 0.06]} />
            <meshStandardMaterial color={colors.pants} roughness={0.85} />
          </mesh>
          <mesh position={[legX + 0.06, 0.55, 0.06]}>
            <boxGeometry args={[0.08, 0.12, 0.06]} />
            <meshStandardMaterial color={colors.pants} roughness={0.85} />
          </mesh>
        </>
      ) : null}

      {/* Jogger ankle cuffs */}
      {isJoggers && !isDress ? (
        <>
          <mesh position={[-legX, 0.16, 0]}>
            <torusGeometry args={[legRadius * 1.15, 0.025, 8, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          <mesh position={[legX, 0.16, 0]}>
            <torusGeometry args={[legRadius * 1.15, 0.025, 8, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
        </>
      ) : null}

      {/* Leather side stripe */}
      {isLeather && !isDress ? (
        <>
          <mesh position={[-legX - legRadius * 0.9, 0.45, 0]}>
            <boxGeometry args={[0.02, 0.5, 0.02]} />
            <meshStandardMaterial
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={0.8}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[legX + legRadius * 0.9, 0.45, 0]}>
            <boxGeometry args={[0.02, 0.5, 0.02]} />
            <meshStandardMaterial
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={0.8}
              toneMapped={false}
            />
          </mesh>
        </>
      ) : null}

      <ShoePair
        shoeId={outfit.shoes}
        color={colors.shoes}
        accent={colors.accent}
        legX={legX}
        isFemale={isFemale}
      />

      {/* Body — silhouette driven by top choice */}
      <group ref={bodyRef} position={[0, 0.95, 0]}>
        {isDress ? (
          <>
            <mesh castShadow position={[0, 0.18, 0]}>
              <capsuleGeometry args={[0.22, 0.28, 12, 24]} />
              <meshStandardMaterial
                ref={glowMatRef}
                color={colors.shirt}
                roughness={material.roughness}
                metalness={material.metalness}
                emissive={baseColor}
                emissiveIntensity={isRave ? 0.65 : 0.25}
              />
            </mesh>
            <mesh castShadow position={[0, -0.42, 0]}>
              <coneGeometry args={[0.42, 0.65, 24]} />
              <meshStandardMaterial
                color={colors.shirt}
                emissive={colors.accent}
                emissiveIntensity={0.25}
                roughness={0.25}
                metalness={0.55}
              />
            </mesh>
            {/* Glitter sparkle band on hem */}
            <mesh position={[0, -0.7, 0]}>
              <torusGeometry args={[0.38, 0.03, 8, 24]} />
              <meshStandardMaterial
                color={colors.accent}
                emissive={colors.accent}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[0, isCropTop ? 0.22 : 0, 0]}>
              <capsuleGeometry
                args={[torsoRadius, (isCropTop ? 0.28 : isMeshTank ? 0.55 : 0.7) * bodyScale, 12, 24]}
              />
              <meshStandardMaterial
                ref={glowMatRef}
                color={colors.shirt}
                roughness={isMeshTank ? 0.35 : material.roughness}
                metalness={isMeshTank ? 0.55 : material.metalness}
                emissive={baseColor}
                emissiveIntensity={isRave ? 0.55 : isMeshTank ? 0.3 : 0.12}
              />
            </mesh>

            {/* Crop midriff skin */}
            {isCropTop ? (
              <mesh castShadow position={[0, -0.18, 0]}>
                <capsuleGeometry args={[torsoRadius * 0.85, 0.22, 8, 16]} />
                <meshStandardMaterial color={SKIN} roughness={0.75} />
              </mesh>
            ) : null}

            {/* Neon jacket: collar + zipper + shoulder pads */}
            {isJacket ? (
              <>
                <mesh position={[0, 0.38, 0.05]}>
                  <boxGeometry args={[0.28, 0.1, 0.22]} />
                  <meshStandardMaterial color={colors.shirt} roughness={0.4} metalness={0.3} />
                </mesh>
                <mesh position={[0, 0.05, 0.28]}>
                  <boxGeometry args={[0.04, 0.55, 0.03]} />
                  <meshStandardMaterial
                    color={colors.accent}
                    emissive={colors.accent}
                    emissiveIntensity={1.6}
                    toneMapped={false}
                  />
                </mesh>
                <mesh position={[-0.28, 0.28, 0]}>
                  <sphereGeometry args={[0.12, 12, 12]} />
                  <meshStandardMaterial color={colors.shirt} roughness={0.45} metalness={0.25} />
                </mesh>
                <mesh position={[0.28, 0.28, 0]}>
                  <sphereGeometry args={[0.12, 12, 12]} />
                  <meshStandardMaterial color={colors.shirt} roughness={0.45} metalness={0.25} />
                </mesh>
              </>
            ) : null}

            {/* Bomber: ribbed hem + stripe */}
            {isBomber ? (
              <>
                <mesh position={[0, -0.38, 0]}>
                  <torusGeometry args={[torsoRadius * 0.95, 0.04, 8, 24]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.7} />
                </mesh>
                <mesh position={[0.22, 0.05, 0.2]} rotation={[0, 0, 0.4]}>
                  <boxGeometry args={[0.08, 0.45, 0.03]} />
                  <meshStandardMaterial
                    color={colors.accent}
                    emissive={colors.accent}
                    emissiveIntensity={1}
                    toneMapped={false}
                  />
                </mesh>
              </>
            ) : null}

            {/* Mesh tank: horizontal straps */}
            {isMeshTank ? (
              <>
                {[-0.08, 0.08, 0.24].map((yy) => (
                  <mesh key={yy} position={[0, yy, 0.22]}>
                    <boxGeometry args={[torsoRadius * 1.6, 0.03, 0.04]} />
                    <meshStandardMaterial
                      color={colors.accent}
                      emissive={colors.accent}
                      emissiveIntensity={0.9}
                      toneMapped={false}
                    />
                  </mesh>
                ))}
              </>
            ) : null}

            {/* Hoodie: hood + front pocket */}
            {isHoodie ? (
              <>
                <mesh position={[0, 0.42, -0.08]} rotation={[-0.5, 0, 0]}>
                  <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
                  <meshStandardMaterial color={colors.shirt} roughness={0.85} metalness={0.05} />
                </mesh>
                <mesh position={[0, -0.12, 0.26]}>
                  <boxGeometry args={[0.28, 0.18, 0.08]} />
                  <meshStandardMaterial color={colors.shirt} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.05, 0.28]}>
                  <boxGeometry args={[0.06, 0.08, 0.04]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.6} />
                </mesh>
              </>
            ) : null}

            {isFemale ? (
              <mesh castShadow position={[0, -0.34, 0]}>
                <sphereGeometry args={[0.27, 16, 16]} />
                <meshStandardMaterial
                  color={isCropTop || isShorts ? colors.pants : colors.pants}
                  roughness={pantsRough}
                  metalness={pantsMetal}
                />
              </mesh>
            ) : null}
          </>
        )}

        {/* Chest badge / style accent */}
        <mesh position={[0, isCropTop ? 0.28 : 0.1, torsoRadius + 0.02]}>
          <sphereGeometry args={[isElegant ? 0.07 : 0.1, 16, 16]} />
          <meshStandardMaterial
            color={neonAccent}
            emissive={colors.accent}
            emissiveIntensity={isRave ? 3.2 : isStreet ? 1.2 : 2.2}
            toneMapped={false}
          />
        </mesh>

        {/* Rave glow belts */}
        {isRave ? (
          <mesh position={[0, -0.2, 0]}>
            <torusGeometry args={[torsoRadius * 1.05, 0.035, 8, 24]} />
            <meshStandardMaterial
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        ) : null}

        {/* Elegant necklace */}
        {isElegant ? (
          <mesh position={[0, 0.32, 0.05]} rotation={[0.4, 0, 0]}>
            <torusGeometry args={[0.14, 0.012, 8, 24]} />
            <meshStandardMaterial
              color="#e9d5ff"
              emissive="#c4b5fd"
              emissiveIntensity={0.8}
              metalness={0.8}
              roughness={0.2}
              toneMapped={false}
            />
          </mesh>
        ) : null}
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
              <>
                {/* Cap brim */}
                <mesh position={[0, 0.16, 0.08]} rotation={[-0.35, 0, 0]}>
                  <cylinderGeometry args={[0.28, 0.28, 0.08, 24]} />
                  <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.1} />
                </mesh>
                <mesh position={[0, 0.12, 0.28]} rotation={[-0.15, 0, 0]}>
                  <boxGeometry args={[0.28, 0.03, 0.16]} />
                  <meshStandardMaterial color="#111318" roughness={0.5} />
                </mesh>
                {/* Sunglasses */}
                <mesh position={[0, 0.01, 0.2]}>
                  <boxGeometry args={[0.32, 0.08, 0.04]} />
                  <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.6} />
                </mesh>
              </>
            ) : null}
            {isElegant ? (
              <>
                <mesh position={[-0.24, -0.02, 0.04]}>
                  <sphereGeometry args={[0.035, 12, 12]} />
                  <meshStandardMaterial
                    color="#e9d5ff"
                    emissive="#c4b5fd"
                    emissiveIntensity={1}
                    metalness={0.9}
                    roughness={0.15}
                    toneMapped={false}
                  />
                </mesh>
                <mesh position={[0.24, -0.02, 0.04]}>
                  <sphereGeometry args={[0.035, 12, 12]} />
                  <meshStandardMaterial
                    color="#e9d5ff"
                    emissive="#c4b5fd"
                    emissiveIntensity={1}
                    metalness={0.9}
                    roughness={0.15}
                    toneMapped={false}
                  />
                </mesh>
              </>
            ) : null}
          </>
        )}
      </group>

      {/* Arms — sleeveless tops show skin; jackets get bulkier sleeves */}
      <group ref={leftArmRef} position={[-shoulderX, 1.2, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[shoulderRadius, 16, 16]} />
          <meshStandardMaterial
            color={sleeveless ? SKIN : colors.shirt}
            roughness={material.roughness}
            metalness={material.metalness}
          />
        </mesh>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[armRadius * (isJacket || isHoodie ? 1.2 : 1), 0.32, 8, 16]} />
          <meshStandardMaterial
            color={sleeveless ? SKIN : isRave && !sleeveless ? "#1a1c23" : armClothColor}
            roughness={material.roughness}
            metalness={isRave || isCyber ? 0.6 : material.metalness}
          />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={isRave || isCyber ? 1.5 : 0.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[shoulderX, 1.2, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[shoulderRadius, 16, 16]} />
          <meshStandardMaterial
            color={sleeveless ? SKIN : colors.shirt}
            roughness={material.roughness}
            metalness={material.metalness}
          />
        </mesh>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[armRadius * (isJacket || isHoodie ? 1.2 : 1), 0.32, 8, 16]} />
          <meshStandardMaterial
            color={sleeveless ? SKIN : isRave && !sleeveless ? "#1a1c23" : armClothColor}
            roughness={material.roughness}
            metalness={isRave || isCyber ? 0.6 : material.metalness}
          />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={isRave || isCyber ? 1.5 : 0.4}
            toneMapped={false}
          />
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
            <pointLight position={[0, 0.05, 0]} intensity={2} color="#67e8f9" distance={1.6} />
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