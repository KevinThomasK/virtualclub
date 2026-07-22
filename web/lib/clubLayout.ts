/** Shared club bounds — keep client movement + server validation in sync. */
export const CLUB_BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -20,
  maxZ: 20,
};

export const CLUB_SIZE = {
  width: 52,
  depth: 40,
  wallHeight: 9,
};

export const DJ_POSITION = { x: 0, y: 0, z: -16 };

/** Clubhouse-style voice chat circle — must match VOICE_SEATS in server/src/rooms/ConcertRoom.ts. */
export const VOICE_LOUNGE = {
  center: { x: 8, z: 13 },
  seatCount: 6,
  radius: 2.3,
};

export type VoiceSeat = { x: number; z: number; rotY: number };

export const VOICE_SEATS: VoiceSeat[] = Array.from(
  { length: VOICE_LOUNGE.seatCount },
  (_, i) => {
    const angle = (i / VOICE_LOUNGE.seatCount) * Math.PI * 2;
    const x = VOICE_LOUNGE.center.x + Math.cos(angle) * VOICE_LOUNGE.radius;
    const z = VOICE_LOUNGE.center.z + Math.sin(angle) * VOICE_LOUNGE.radius;
    return {
      x,
      z,
      rotY: Math.atan2(VOICE_LOUNGE.center.x - x, VOICE_LOUNGE.center.z - z),
    };
  },
);
