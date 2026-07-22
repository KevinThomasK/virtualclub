import { MapSchema, Schema, defineTypes } from "@colyseus/schema";

export class Player extends Schema {
  userId = "";
  name = "";
  x = 0;
  y = 0;
  z = 0;
  rotY = 0;
  anim = "idle";
  color = "#6366f1";
  chat = "";
  shirt = "neon-jacket";
  pants = "cargo";
  shoes = "high-tops";
  style = "cyber";
  gender = "male";
  seat = -1;
}

defineTypes(Player, {
  userId: "string",
  name: "string",
  x: "number",
  y: "number",
  z: "number",
  rotY: "number",
  anim: "string",
  color: "string",
  chat: "string",
  shirt: "string",
  pants: "string",
  shoes: "string",
  style: "string",
  gender: "string",
  seat: "number",
});

export class ConcertState extends Schema {
  players!: MapSchema<Player>;
  dropUntil = 0;
  energy = 0;
  partyUntil = 0;
}

defineTypes(ConcertState, {
  players: { map: Player },
  dropUntil: "number",
  energy: "number",
  partyUntil: "number",
});
