import type { AvatarOutfit } from "@/lib/avatarCatalog";

export type AnimState =
  | "idle"
  | "walk"
  | "dance"
  | "wave"
  | "cheer"
  | "pose"
  | "sit"
  | "chill";

export type EmoteType = "dance" | "wave" | "cheer" | "pose";

export type PlayerSnapshot = {
  sessionId: string;
  userId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: AnimState;
  chat: string;
  seat: number;
} & AvatarOutfit;

export type MovePayload = {
  type: "move";
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: "idle" | "walk";
};

export type EmotePayload = {
  type: "emote";
  emote: EmoteType;
};

export type ChatPayload = {
  type: "chat";
  text: string;
};
