export type ConcertZone = {
  id: string;
  label: string;
  hint: string;
  x: number;
  z: number;
  radius: number;
  color: string;
};

export const CONCERT_ZONES: ConcertZone[] = [
  {
    id: "dancefloor",
    label: "Main Dance Floor",
    hint: "Center of the club — press Space to dance",
    x: 0,
    z: -2,
    radius: 7,
    color: "#818cf8",
  },
  {
    id: "dj",
    label: "DJ Booth",
    hint: "Front row — feel the bass drop",
    x: 0,
    z: -14,
    radius: 4,
    color: "#f472b6",
  },
  {
    id: "bar",
    label: "Neon Bar",
    hint: "Grab a vibe at the bar",
    x: -18,
    z: 2,
    radius: 4,
    color: "#22d3ee",
  },
  {
    id: "vip",
    label: "VIP Booth",
    hint: "Exclusive corner — emotes glow brighter",
    x: 18,
    z: -4,
    radius: 4.5,
    color: "#fbbf24",
  },
  {
    id: "lounge",
    label: "Chill Lounge",
    hint: "Low lights, comfy seating",
    x: -16,
    z: 14,
    radius: 4,
    color: "#a78bfa",
  },
  {
    id: "photo",
    label: "Neon Photo Wall",
    hint: "Press R for a photo pose",
    x: 16,
    z: 14,
    radius: 3.5,
    color: "#fb7185",
  },
  {
    id: "voice",
    label: "Voice Lounge",
    hint: "Press G to take a seat and talk live with everyone seated",
    x: 8,
    z: 13,
    radius: 4.2,
    color: "#34d399",
  },
];

export function getZoneAt(x: number, z: number): ConcertZone | null {
  for (const zone of CONCERT_ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (dx * dx + dz * dz <= zone.radius * zone.radius) {
      return zone;
    }
  }
  return null;
}
