import type { EmoteType } from "@/lib/types";

export type ClubQuest = {
  id: string;
  title: string;
  description: string;
  reward: string;
  target: number;
  metric: "zones" | "tokens" | "emotes" | "chats" | "hype" | "interactions";
};

export type ZoneAction = {
  label: string;
  hint: string;
  chatMessage: string;
  emote?: EmoteType;
  glowSeconds?: number;
};

export type PulseToken = {
  id: string;
  x: number;
  z: number;
  label: string;
};

export const CLUB_QUESTS: ClubQuest[] = [
  {
    id: "explorer",
    title: "Club Explorer",
    description: "Visit every area of the club",
    reward: "+VIP glow aura",
    target: 6,
    metric: "zones",
  },
  {
    id: "collector",
    title: "Pulse Collector",
    description: "Find hidden pulse tokens around the club",
    reward: "Neon trail boost",
    target: 8,
    metric: "tokens",
  },
  {
    id: "dancer",
    title: "Dance Fever",
    description: "Use emotes out on the floor",
    reward: "Dance floor legend",
    target: 5,
    metric: "emotes",
  },
  {
    id: "social",
    title: "Crowd Hype",
    description: "Chat with other club-goers",
    reward: "Social butterfly badge",
    target: 4,
    metric: "chats",
  },
  {
    id: "party",
    title: "Party Starter",
    description: "Trigger a hype drop for everyone",
    reward: "Main character energy",
    target: 1,
    metric: "hype",
  },
  {
    id: "regular",
    title: "Zone Regular",
    description: "Use zone interactions (press G in a zone)",
    reward: "Locals know your name",
    target: 4,
    metric: "interactions",
  },
];

export const ZONE_ACTIONS: Record<string, ZoneAction> = {
  dancefloor: {
    label: "Start dance",
    hint: "Hit the floor — auto dance emote",
    chatMessage: "Let's go! 🔥",
    emote: "dance",
  },
  dj: {
    label: "Hype the DJ",
    hint: "Show love to the booth",
    chatMessage: "Drop the bass! 🎧",
    emote: "cheer",
  },
  bar: {
    label: "Order neon drink",
    hint: "Glow boost for 45 seconds",
    chatMessage: "Neon fizz, please! 🍹",
    glowSeconds: 45,
  },
  vip: {
    label: "VIP toast",
    hint: "Celebrate in the booth",
    chatMessage: "Cheers from VIP! 🥂",
    emote: "pose",
  },
  lounge: {
    label: "Chill out",
    hint: "Relax on the lounge seating",
    chatMessage: "Chilling in the lounge ✨",
    emote: "wave",
  },
  photo: {
    label: "Photo snap",
    hint: "Strike a pose at the wall",
    chatMessage: "Photo at the neon wall! 📸",
    emote: "pose",
  },
  // Display-only: the voice zone's G action is handled specially
  // (sit/stand + WebRTC) in ConcertExperience, not via chat/emote.
  voice: {
    label: "Sit & talk live",
    hint: "Join the voice circle",
    chatMessage: "Joined the voice lounge 🎙️",
  },
};

/** Hidden collectibles scattered around the club — walk close and press G. */
export const PULSE_TOKENS: PulseToken[] = [
  { id: "t1", x: -6, z: -4, label: "Floor token" },
  { id: "t2", x: 8, z: -6, label: "Speaker token" },
  { id: "t3", x: -20, z: 0, label: "Bar token" },
  { id: "t4", x: 20, z: -2, label: "VIP token" },
  { id: "t5", x: -14, z: 12, label: "Lounge token" },
  { id: "t6", x: 14, z: 12, label: "Photo token" },
  { id: "t7", x: 0, z: -15, label: "DJ token" },
  { id: "t8", x: -22, z: -14, label: "Corner token" },
  { id: "t9", x: 22, z: 14, label: "Back token" },
  { id: "t10", x: 0, z: 16, label: "Entrance token" },
];

export const TOKEN_PICKUP_RADIUS = 2.2;

export function getZoneAction(zoneId: string): ZoneAction | null {
  return ZONE_ACTIONS[zoneId] ?? null;
}
