"use client";

import { useMemo, useRef } from "react";
import {
  Sparkles,
  Text,
  shaderMaterial,
} from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DjCharacter } from "@/components/DjCharacter";
import { BartenderCharacter } from "@/components/BartenderCharacter";
import { CLUB_SIZE, DJ_POSITION, VOICE_LOUNGE } from "@/lib/clubLayout";

const { width, depth, wallHeight } = CLUB_SIZE;

const LedWallMaterial = shaderMaterial(
  { uTime: 0, uColorA: new THREE.Color("#ff2e88"), uColorB: new THREE.Color("#2ee6ff") },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;
    void main() {
      float wave = sin((vUv.x * 8.0) + uTime * 1.6) * 0.5 + 0.5;
      float bands = smoothstep(0.0, 1.0, sin(vUv.x * 50.0 + uTime * 2.2) * 0.5 + 0.5);
      vec3 color = mix(uColorA, uColorB, wave);
      color *= 0.5 + vUv.y * 0.8;
      color += bands * 0.08;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
);
extend({ LedWallMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    ledWallMaterial: any;
  }
}

function ClubShell() {
  const halfW = width / 2;
  const halfD = depth / 2;

  return (
    <group>
      {/* Main floor — simple bright material (reflective shader often renders black) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#222233" roughness={0.55} metalness={0.25} />
      </mesh>

      {/* Dance floor inset — glowing grid tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial
          color="#2d2d44"
          emissive="#6366f1"
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.45}
        />
      </mesh>
      <DanceFloorTiles />

      {/* Back wall */}
      <mesh position={[0, wallHeight / 2, -halfD]}>
        <boxGeometry args={[width, wallHeight, 0.5]} />
        <meshStandardMaterial color="#1a1a28" roughness={0.9} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-halfW, wallHeight / 2, 0]}>
        <boxGeometry args={[0.5, wallHeight, depth]} />
        <meshStandardMaterial color="#1c1c2a" roughness={0.9} />
      </mesh>
      <mesh position={[halfW, wallHeight / 2, 0]}>
        <boxGeometry args={[0.5, wallHeight, depth]} />
        <meshStandardMaterial color="#1c1c2a" roughness={0.9} />
      </mesh>
      {/* Front wall / entrance — shorter so camera can see in */}
      <mesh position={[0, wallHeight / 2, halfD]}>
        <boxGeometry args={[width, wallHeight, 0.5]} />
        <meshStandardMaterial color="#1a1a28" roughness={0.9} />
      </mesh>

      {/* Neon wall strips */}
      {[
        [-halfW + 0.3, 0, -halfD + 4, 0.12, 2.5, depth - 8, "#22d3ee"],
        [halfW - 0.3, 0, -halfD + 4, 0.12, 2.5, depth - 8, "#f472b6"],
        [0, 0, -halfD + 0.3, width - 4, 2.5, 0.12, "#a78bfa"],
      ].map(([x, y, z, sx, sy, sz, color], i) => (
        <mesh key={i} position={[x as number, 2.2, z as number]}>
          <boxGeometry args={[sx as number, sy as number, sz as number]} />
          <meshStandardMaterial
            color={color as string}
            emissive={color as string}
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#12121a" roughness={1} />
      </mesh>

      {/* Ceiling truss */}
      {[-16, -8, 0, 8, 16].map((x) => (
        <mesh key={x} position={[x, wallHeight - 0.3, -4]}>
          <boxGeometry args={[0.2, 0.2, 28]} />
          <meshStandardMaterial color="#52525b" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

const TILE_COLORS = ["#818cf8", "#22d3ee", "#f472b6", "#4338ca"];

function DanceFloorTiles() {
  const tiles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => ({
          x: -8 + col * 2,
          z: -8 + row * 2,
          phase: (row * 1.3 + col * 0.7) % (Math.PI * 2),
          colorIndex: (row + col) % TILE_COLORS.length,
        })),
      ).flat(),
    [],
  );
  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tiles.forEach((tile, i) => {
      const material = materialRefs.current[i];
      if (!material) return;
      material.opacity = 0.12 + (Math.sin(t * 2.4 + tile.phase) * 0.5 + 0.5) * 0.3;
    });
  });

  return (
    <group>
      {tiles.map((tile, i) => (
        <mesh
          key={`${tile.x}-${tile.z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[tile.x, 0.04, tile.z]}
        >
          <planeGeometry args={[1.85, 1.85]} />
          <meshBasicMaterial
            ref={(el) => {
              materialRefs.current[i] = el;
            }}
            color={TILE_COLORS[tile.colorIndex]}
            transparent
            opacity={0.18}
          />
        </mesh>
      ))}
    </group>
  );
}

function DiscoBall({ party }: { party: boolean }) {
  const ballRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const facets = useMemo(() => {
    const items: { position: THREE.Vector3; rotation: THREE.Euler }[] = [];
    const radius = 0.72;
    for (let lat = 0; lat < 8; lat += 1) {
      const phi = (lat / 7) * Math.PI;
      const ringCount = Math.max(3, Math.round(Math.sin(phi) * 14));
      for (let lon = 0; lon < ringCount; lon += 1) {
        const theta = (lon / ringCount) * Math.PI * 2;
        const position = new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        );
        const rotation = new THREE.Euler();
        const lookAt = new THREE.Matrix4().lookAt(
          position,
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 1, 0),
        );
        rotation.setFromRotationMatrix(lookAt);
        items.push({ position, rotation });
      }
    }
    return items;
  }, []);

  useFrame(({ clock }, delta) => {
    if (ballRef.current) {
      ballRef.current.rotation.y += delta * (party ? 2.4 : 0.5);
    }
    if (lightRef.current) {
      const hue = (clock.elapsedTime * (party ? 0.35 : 0.06)) % 1;
      lightRef.current.color.setHSL(hue, 0.75, 0.6);
      lightRef.current.intensity = party ? 45 : 22;
    }
  });

  return (
    <group position={[0, 7.6, -2]}>
      {/* Hanging rod */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.9} roughness={0.3} />
      </mesh>
      <group ref={ballRef}>
        <mesh>
          <sphereGeometry args={[0.68, 24, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.12} envMapIntensity={2.5} />
        </mesh>
        {facets.map((facet, i) => (
          <mesh key={i} position={facet.position} rotation={facet.rotation}>
            <planeGeometry args={[0.14, 0.14]} />
            <meshStandardMaterial
              color="#f8fafc"
              metalness={1}
              roughness={0.05}
              envMapIntensity={3}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
      <pointLight ref={lightRef} intensity={22} distance={28} color="#e0e7ff" />
      <Sparkles count={party ? 60 : 24} scale={[6, 4, 6]} size={party ? 4 : 2.5} speed={0.5} color="#e0e7ff" />
    </group>
  );
}

const LASER_COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24"];

function LaserShow({ party }: { party: boolean }) {
  const pivotRefs = useRef<(THREE.Group | null)[]>([]);
  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const emitters = useMemo(
    () => [
      { x: -10, z: DJ_POSITION.z + 2, dir: 1 },
      { x: 10, z: DJ_POSITION.z + 2, dir: -1 },
    ],
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = party ? 3.2 : 1.1;
    pivotRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      const emitterIndex = Math.floor(i / 4);
      const beamIndex = i % 4;
      const dir = emitters[emitterIndex].dir;
      pivot.rotation.z = dir * (0.5 + Math.sin(t * speed + beamIndex * 1.7) * 0.55);
      pivot.rotation.x = Math.sin(t * speed * 0.6 + beamIndex) * 0.25;
      const material = materialRefs.current[i];
      if (material) {
        material.opacity = party
          ? 0.5 + Math.sin(t * 6 + beamIndex) * 0.25
          : 0.22 + Math.sin(t * 2 + beamIndex) * 0.08;
      }
    });
  });

  return (
    <group>
      {emitters.map((emitter, e) => (
        <group key={e} position={[emitter.x, 8.4, emitter.z]}>
          {/* Emitter housing */}
          <mesh>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
          </mesh>
          {LASER_COLORS.map((color, b) => (
            <group
              key={color}
              ref={(el) => {
                pivotRefs.current[e * 4 + b] = el;
              }}
            >
              {/* Beam hangs below the pivot so it sweeps from the emitter */}
              <mesh position={[0, -8, 0]}>
                <boxGeometry args={[0.05, 16, 0.05]} />
                <meshBasicMaterial
                  ref={(el) => {
                    materialRefs.current[e * 4 + b] = el;
                  }}
                  color={color}
                  transparent
                  opacity={0.25}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function DjBooth() {
  const ledRef = useRef<any>(null);
  const deckRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ledRef.current) ledRef.current.uTime = clock.elapsedTime;
    if (deckRef.current) {
      deckRef.current.rotation.y = clock.elapsedTime * 1.8;
    }
  });

  return (
    <group position={[DJ_POSITION.x, 0, DJ_POSITION.z]}>
      {/* Raised platform */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 0.7, 5]} />
        <meshStandardMaterial color="#14141f" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* LED backdrop */}
      <mesh position={[0, 3.8, -2.1]}>
        <planeGeometry args={[13, 5.5]} />
        <ledWallMaterial ref={ledRef} toneMapped={false} />
      </mesh>

      <Text
        position={[0, 5.8, -2]}
        fontSize={0.55}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ff2e88"
      >
        PULSE CLUB
      </Text>

      {/* DJ desk */}
      <mesh position={[0, 0.85, 0.2]} castShadow>
        <boxGeometry args={[5, 0.15, 1.4]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Turntable */}
      <group ref={deckRef} position={[-1.2, 0.98, 0.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshStandardMaterial color="#0f0f14" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Animated DJ — MIT Xbot model (three.js examples / Mixamo) */}
      <DjCharacter />

      {/* Main speakers */}
      {[-5.5, 5.5].map((x) => (
        <group key={x} position={[x, 1.4, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 2.4, 1]} />
            <meshStandardMaterial color="#0a0a0f" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0.52]}>
            <circleGeometry args={[0.35, 24]} />
            <meshStandardMaterial color="#6366f1" emissive="#818cf8" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, -0.5, 0.52]}>
            <circleGeometry args={[0.5, 24]} />
            <meshStandardMaterial color="#1f2937" emissive="#4338ca" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BarArea() {
  const stools = useMemo(
    () => [-2.5, -0.8, 0.8, 2.5].map((x) => ({ x })),
    [],
  );

  return (
    <group position={[-18, 0, 2]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 1.1, 2.2]} />
        <meshStandardMaterial color="#15151f" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, 1.08, -0.3]}>
        <boxGeometry args={[7.6, 0.08, 0.8]} />
        <meshStandardMaterial
          color="#0e7490"
          emissive="#22d3ee"
          emissiveIntensity={0.35}
          roughness={0.2}
        />
      </mesh>
      {stools.map(({ x }) => (
        <group key={x} position={[x, 0, 1.2]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
            <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
            <meshStandardMaterial color="#52525b" metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Bottle silhouettes */}
      {[-2, 0, 2].map((x) => (
        <mesh key={x} position={[x, 1.25, -0.15]}>
          <cylinderGeometry args={[0.06, 0.08, 0.35, 8]} />
          <meshStandardMaterial
            color={x === 0 ? "#f472b6" : "#a78bfa"}
            emissive={x === 0 ? "#f472b6" : "#a78bfa"}
            emissiveIntensity={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      <BartenderCharacter />
      <Text position={[0, 2.4, 0]} fontSize={0.28} color="#22d3ee" anchorX="center">
        BAR
      </Text>
    </group>
  );
}

function VipBooths() {
  return (
    <group position={[18, 0, -4]}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[7, 0.5, 5]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>
      <mesh position={[-2.8, 1.2, 0]}>
        <boxGeometry args={[0.08, 2.2, 4.5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[2.8, 1.2, 0]}>
        <boxGeometry args={[0.08, 2.2, 4.5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[6, 0.15, 4]} />
        <meshStandardMaterial color="#422006" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4, 0.5, 2]} />
        <meshStandardMaterial color="#292524" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 2.5, 0]} intensity={8} color="#fbbf24" distance={6} />
      <Text position={[0, 3.2, 0]} fontSize={0.26} color="#fbbf24" anchorX="center">
        VIP
      </Text>
    </group>
  );
}

function LoungeArea() {
  return (
    <group position={[-16, 0, 14]}>
      {/* Soft rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.6]} receiveShadow>
        <planeGeometry args={[6.5, 4.2]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.95} />
      </mesh>

      {/* Couch base */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 0.55, 2.0]} />
        <meshStandardMaterial color="#312e81" roughness={0.85} />
      </mesh>
      {/* Seat cushions */}
      {[-1.5, 0, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.15]} castShadow>
          <boxGeometry args={[1.45, 0.22, 1.5]} />
          <meshStandardMaterial color="#4338ca" roughness={0.9} />
        </mesh>
      ))}
      {/* Backrest */}
      <mesh position={[0, 0.95, -0.75]} castShadow>
        <boxGeometry args={[5.2, 0.95, 0.45]} />
        <meshStandardMaterial color="#3730a3" roughness={0.88} />
      </mesh>
      {/* Armrests */}
      {[-2.45, 2.45].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} castShadow>
          <boxGeometry args={[0.35, 0.7, 2.0]} />
          <meshStandardMaterial color="#312e81" roughness={0.85} />
        </mesh>
      ))}

      {/* Coffee table + drinks */}
      <mesh position={[0, 0.28, 1.55]} castShadow>
        <boxGeometry args={[2.2, 0.12, 0.9]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 1.55]}>
        <boxGeometry args={[0.15, 0.28, 0.15]} />
        <meshStandardMaterial color="#312e81" />
      </mesh>
      {[
        [-0.45, "#22d3ee"],
        [0.05, "#a78bfa"],
        [0.5, "#f472b6"],
      ].map(([x, color]) => (
        <mesh key={String(x)} position={[x as number, 0.42, 1.55]}>
          <cylinderGeometry args={[0.05, 0.04, 0.14, 10]} />
          <meshStandardMaterial
            color={color as string}
            emissive={color as string}
            emissiveIntensity={0.7}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}

      <pointLight position={[0, 2.2, 0.4]} intensity={7} color="#a78bfa" distance={7} />
      <Text position={[0, 2.55, -0.2]} fontSize={0.26} color="#c4b5fd" anchorX="center">
        CHILL LOUNGE
      </Text>
      <Text position={[0, 2.2, -0.2]} fontSize={0.14} color="#a78bfa" anchorX="center">
        press G to sit & sip
      </Text>
    </group>
  );
}

function PhotoWall() {
  return (
    <group position={[16, 0, 14]}>
      <mesh position={[0, 2.5, -0.3]}>
        <planeGeometry args={[5, 3.5]} />
        <meshStandardMaterial
          color="#701a75"
          emissive="#ec4899"
          emissiveIntensity={0.25}
          roughness={0.6}
        />
      </mesh>
      <Text position={[0, 2.5, -0.25]} fontSize={0.32} color="#fbcfe8" anchorX="center">
        PHOTO
      </Text>
      <Sparkles count={25} scale={[4, 3, 2]} position={[0, 2.5, 0]} size={2} color="#f472b6" />
    </group>
  );
}

/** Static decor for the Clubhouse-style voice circle; seats are interactive and live in ConcertScene. */
function VoiceLoungeDecor() {
  const { center, radius } = VOICE_LOUNGE;

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Raised circular platform */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[radius + 1.3, radius + 1.5, 0.12, 32]} />
        <meshStandardMaterial color="#1e1b3a" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Glowing rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
        <ringGeometry args={[radius + 1.1, radius + 1.3, 48]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Center table with a mic */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.7, 16]} />
        <meshStandardMaterial color="#292540" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <meshStandardMaterial color="#52525b" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#34d399"
          emissive="#34d399"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 2.6, 0]} intensity={9} color="#34d399" distance={9} />
      <Text position={[0, 3.1, 0]} fontSize={0.3} color="#6ee7b7" anchorX="center">
        VOICE LOUNGE
      </Text>
      <Text position={[0, 2.7, 0]} fontSize={0.16} color="#a7f3d0" anchorX="center">
        sit down to talk live
      </Text>
    </group>
  );
}

function CeilingLights() {
  const spots = useMemo(
    () =>
      [-12, -6, 0, 6, 12].flatMap((x) => [
        { x, z: -6, i: x + 6 },
        { x, z: 2, i: x + 20 },
      ]),
    [],
  );
  const spotRefs = useRef<THREE.SpotLight[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    spots.forEach((light, i) => {
      const spot = spotRefs.current[i];
      if (!spot) return;
      const swing = Math.sin(t * 0.5 + i) * 3;
      spot.target.position.set(light.x + swing, 0, light.z);
      spot.target.updateMatrixWorld();
      const hue = (t * 0.04 + i * 0.07) % 1;
      spot.color.setHSL(hue, 0.85, 0.55);
    });
  });

  return (
    <group>
      {spots.map((light, i) => (
        <spotLight
          key={`${light.x}-${light.z}`}
          ref={(el) => {
            if (el) spotRefs.current[i] = el;
          }}
          position={[light.x, 8.2, light.z]}
          angle={0.38}
          penumbra={0.55}
          intensity={55}
          distance={32}
        />
      ))}
    </group>
  );
}

function ClubDecor() {
  const pillars = useMemo(
    () => [
      [-22, -12],
      [22, -12],
      [-22, 10],
      [22, 10],
    ],
    [],
  );

  return (
    <group>
      {pillars.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 2.5, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 5, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* Velvet ropes near VIP */}
      <mesh position={[12, 0.6, -4]}>
        <cylinderGeometry args={[0.03, 0.03, 6, 8]} />
        <meshStandardMaterial color="#991b1b" roughness={0.8} />
      </mesh>

      {/* Entrance sign */}
      <Text
        position={[0, 3.2, 18.5]}
        fontSize={0.4}
        color="#e2e8f0"
        anchorX="center"
        outlineWidth={0.015}
        outlineColor="#6366f1"
      >
        ENTRANCE
      </Text>
    </group>
  );
}

function AmbientCrowd() {
  const count = 48;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const edge = i % 4;
        let x = THREE.MathUtils.randFloatSpread(44);
        let z = THREE.MathUtils.randFloatSpread(34);
        if (edge === 0) {
          x = -24 + Math.random() * 4;
        } else if (edge === 1) {
          x = 20 + Math.random() * 4;
        } else if (edge === 2) {
          z = -18 + Math.random() * 3;
        } else {
          z = 16 + Math.random() * 3;
        }
        return { x, z, bob: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 2 };
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    data.forEach((p, i) => {
      const bob = Math.sin(clock.elapsedTime * p.speed + p.bob) * 0.06;
      dummy.position.set(p.x, 0.85 + bob, p.z);
      dummy.rotation.y = Math.sin(clock.elapsedTime * 0.15 + i) * 0.4;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <capsuleGeometry args={[0.22, 0.85, 4, 8]} />
      <meshStandardMaterial color="#3f3f46" roughness={0.85} />
    </instancedMesh>
  );
}

type ClubEnvironmentProps = {
  dropActive: boolean;
  partyActive?: boolean;
  djMode?: string;
};

export function ClubEnvironment({
  dropActive,
  partyActive = false,
  djMode = "",
}: ClubEnvironmentProps) {
  const boosted = dropActive || partyActive || djMode === "hyper" || djMode === "bass";
  const discoParty = partyActive || djMode === "hyper" || djMode === "bass";

  return (
    <group>
      <ClubShell />
      <DjBooth />
      <BarArea />
      <VipBooths />
      <LoungeArea />
      <PhotoWall />
      <VoiceLoungeDecor />
      <ClubDecor />
      <CeilingLights />
      <AmbientCrowd />
      <DiscoBall party={discoParty} />
      <LaserShow party={discoParty || djMode === "chill"} />
      <Sparkles
        count={boosted ? 100 : 50}
        scale={[width, 6, depth]}
        position={[0, 4, -2]}
        size={boosted ? 3 : 2}
        speed={0.35}
        opacity={0.28}
        color={
          djMode === "chill"
            ? "#67e8f9"
            : djMode === "bass"
              ? "#ff7eb9"
              : boosted
                ? "#ff7eb9"
                : "#818cf8"
        }
      />
    </group>
  );
}
