"use client";

import dynamic from "next/dynamic";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Avatar } from "@/components/Avatar";
import type { AvatarOutfit } from "@/lib/avatarCatalog";

function SpinningAvatar({
  name,
  outfit,
}: {
  name: string;
  outfit: AvatarOutfit;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <group ref={ref}>
      <Avatar name={name || "YOU"} outfit={outfit} anim="idle" isLocal preview />
    </group>
  );
}

type AvatarPreviewProps = {
  name: string;
  outfit: AvatarOutfit;
};

function PreviewCamera() {
  return (
    <OrbitControls
      target={[0, 1.15, 0]}
      enablePan={false}
      enableZoom
      minDistance={4.8}
      maxDistance={7.5}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 1.75}
    />
  );
}

function PreviewScene({ name, outfit }: AvatarPreviewProps) {
  return (
    <>
      <color attach="background" args={["#05060d"]} />
      <ambientLight intensity={0.55} />
      <directionalLight intensity={1.1} position={[4, 8, 2]} />
      <pointLight intensity={12} position={[-3, 4, -2]} color={outfit.color} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#111827" roughness={0.85} metalness={0.2} />
      </mesh>
      <SpinningAvatar name={name} outfit={outfit} />
      <PreviewCamera />
    </>
  );
}

export function AvatarPreview(props: AvatarPreviewProps) {
  return (
    <div
      style={{
        width: "100%",
        height: 380,
        borderRadius: 16,
        overflow: "visible",
        border: "1px solid rgba(148,163,184,0.2)",
        background: "radial-gradient(circle at 50% 20%, #1e1b4b55, #05060d)",
        position: "relative",
      }}
    >
      <Canvas
        camera={{ position: [0, 1.45, 5.8], fov: 50, near: 0.1, far: 100 }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 16,
          display: "block",
          overflow: "hidden",
        }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <PreviewScene {...props} />
      </Canvas>
    </div>
  );
}

export const AvatarPreviewLazy = dynamic(
  () => Promise.resolve({ default: AvatarPreview }),
  { ssr: false },
);
