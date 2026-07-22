"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PhotoFlashEvent } from "@/hooks/useConcertRoom";

type PhotoFlashesProps = {
  flashes: PhotoFlashEvent[];
};

/** Camera flash + floating shutter card at the photo wall when someone snaps. */
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
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const cardRef = useRef<THREE.Group>(null);
  const start = useRef(performance.now());

  useFrame(() => {
    const elapsed = (performance.now() - start.current) / 1000;
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, 140 * (1 - elapsed / 0.55));
    }
    if (orbRef.current) {
      const mat = orbRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.85 * (1 - elapsed / 0.5));
      orbRef.current.scale.setScalar(1 + elapsed * 3.2);
    }
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 * (1 - elapsed / 1.1));
      ringRef.current.scale.setScalar(1 + elapsed * 2.4);
    }
    if (cardRef.current) {
      cardRef.current.position.y = 2.6 + elapsed * 1.1;
      cardRef.current.scale.setScalar(Math.max(0.2, 1 - elapsed * 0.12));
    }
  });

  return (
    <group position={[flash.x, 0, flash.z]}>
      <pointLight
        ref={lightRef}
        position={[0, 2.4, 0.8]}
        color="#fff7fb"
        intensity={140}
        distance={22}
        decay={1.6}
      />
      <mesh ref={orbRef} position={[0, 2.2, 0.5]}>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.6, 1.15, 48]} />
        <meshBasicMaterial
          color="#fbcfe8"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={cardRef} position={[0, 2.6, 0.2]}>
        <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div
            style={{
              minWidth: 140,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(12, 10, 24, 0.92)",
              border: "1px solid rgba(244, 114, 182, 0.65)",
              boxShadow: "0 0 28px rgba(236, 72, 153, 0.45)",
              color: "#fff",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1 }}>📸</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.4,
                color: "#fbcfe8",
              }}
            >
              {flash.name}
            </div>
            <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>
              photo snapped
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
