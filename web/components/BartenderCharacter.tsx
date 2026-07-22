"use client";

import { Avatar } from "@/components/Avatar";
import { DEFAULT_OUTFIT } from "@/lib/avatarCatalog";

/** Bartender behind the neon bar — greets guests with a wave. */
export function BartenderCharacter() {
  const outfit = {
    ...DEFAULT_OUTFIT,
    gender: "female" as const,
    color: "#22d3ee",
    style: "elegant" as const,
    shirt: "mesh-tank",
    pants: "leather",
    shoes: "platforms",
  };

  return (
    <group position={[0.35, 0, -0.95]} rotation={[0, 0.15, 0]}>
      <Avatar
        name="Bartender"
        outfit={outfit}
        anim="wave"
        showNameTag
        glowBoost
      />
      {/* Shaker on the counter beside them */}
      <group position={[-0.55, 1.15, 0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.28, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.08, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}
