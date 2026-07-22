"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PULSE_TOKENS } from "@/lib/clubActivities";

type ClubCollectiblesProps = {
  collectedIds: Set<string>;
};

export function ClubCollectibles({ collectedIds }: ClubCollectiblesProps) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const visible = useMemo(
    () => PULSE_TOKENS.filter((token) => !collectedIds.has(token.id)),
    [collectedIds],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    visible.forEach((token) => {
      const index = PULSE_TOKENS.findIndex((entry) => entry.id === token.id);
      const mesh = meshRefs.current[index];
      if (!mesh) return;
      mesh.position.y = 1.1 + Math.sin(t * 2 + index) * 0.15;
      mesh.rotation.y = t * 1.2 + index;
    });
  });

  return (
    <group>
      {PULSE_TOKENS.map((token, index) => {
        if (collectedIds.has(token.id)) return null;
        return (
          <group key={token.id} position={[token.x, 1.1, token.z]}>
            <mesh
              ref={(el) => {
                meshRefs.current[index] = el;
              }}
            >
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color="#a78bfa"
                emissive="#818cf8"
                emissiveIntensity={1.4}
                toneMapped={false}
                transparent
                opacity={0.92}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
              <ringGeometry args={[0.35, 0.5, 24]} />
              <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
            </mesh>
            <pointLight intensity={4} distance={3} color="#c4b5fd" />
          </group>
        );
      })}
    </group>
  );
}
