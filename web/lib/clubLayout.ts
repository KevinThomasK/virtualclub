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

/** Couch seats in the Chill Lounge — indices are offset so they never collide with voice seats. */
export const LOUNGE_SEAT_OFFSET = 10;
export const LOUNGE_ORIGIN = { x: -16, z: 14 };

export const LOUNGE_SEATS: VoiceSeat[] = [
  { x: LOUNGE_ORIGIN.x - 1.4, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
  { x: LOUNGE_ORIGIN.x, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
  { x: LOUNGE_ORIGIN.x + 1.4, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
];

export function isVoiceSeat(seat: number) {
  return seat >= 0 && seat < VOICE_LOUNGE.seatCount;
}

export function isLoungeSeat(seat: number) {
  return (
    seat >= LOUNGE_SEAT_OFFSET &&
    seat < LOUNGE_SEAT_OFFSET + LOUNGE_SEATS.length
  );
}

export function getSeatWorld(seat: number): VoiceSeat | null {
  if (isVoiceSeat(seat)) return VOICE_SEATS[seat];
  if (isLoungeSeat(seat)) return LOUNGE_SEATS[seat - LOUNGE_SEAT_OFFSET];
  return null;
}

