"use client";

import { useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PhotoFlashEvent } from "@/hooks/useConcertRoom";

type PhotoFlashesProps = {
  flashes: PhotoFlashEvent[];
};

/** Camera flash + floating 📸 at the photo wall when someone snaps. */
export function PhotoFlashes({ flashes }: PhotoFlashesProps) {
  return (
    <group>
      {flashes.map((flash) => (
        <PhotoFlashBurst key={flash.id} flash={flash} />
      ))}
    </group>
  );
}

function PhotoFlashBurst({ flash }: { flash: PhotoFlashEvent }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const groupRef = useRef<THREE.Group>(null);
  const start = useRef(performance.now());

  useFrame(() => {
    const elapsed = (performance.now() - start.current) / 1000;
    if (lightRef.current) {
      // Bright flash that dies in ~0.4s
      lightRef.current.intensity = Math.max(0, 80 * (1 - elapsed / 0.45));
    }
    if (groupRef.current) {
      groupRef.current.position.y = 2.4 + elapsed * 1.2;
      const mat = (groupRef.current.children[0] as THREE.Mesh | undefined)
        ?.material as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = Math.max(0, 1 - elapsed / 2.6);
    }
  });

  return (
    <group position={[flash.x, 0, flash.z]}>
      <pointLight
        ref={lightRef}
        position={[0, 2.2, 0.6]}
        color="#ffffff"
        intensity={80}
        distance={14}
        decay={2}
      />
      <mesh position={[0, 2.1, 0.4]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
      <group ref={groupRef} position={[0, 2.4, 0]}>
        <Text fontSize={0.55} color="#ffffff" anchorX="center" anchorY="middle">
          📸
        </Text>
        <Text
          position={[0, -0.45, 0]}
          fontSize={0.18}
          color="#fbcfe8"
          anchorX="center"
        >
          {flash.name}
        </Text>
      </group>
    </group>
  );
}
