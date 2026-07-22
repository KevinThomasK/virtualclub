"use client";

import { Avatar } from "@/components/Avatar";
import { DEFAULT_OUTFIT } from "@/lib/avatarCatalog";

/** DJ at the booth — uses the same stylized avatar with a looping dance emote. */
export function DjCharacter() {
  const djOutfit = {
    ...DEFAULT_OUTFIT,
    color: "#22d3ee",
    style: "rave" as const,
    shirt: "neon-jacket",
    shoes: "glow-runners",
  };

  return (
    <group position={[0.8, 0, 0]} rotation={[0, -0.35, 0]}>
      <Avatar
        name="DJ"
        outfit={djOutfit}
        anim="dance"
        showNameTag={false}
        glowBoost
      />
    </group>
  );
}
