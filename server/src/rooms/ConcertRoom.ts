import { Room, Client } from "colyseus";
import { ConcertState, Player } from "../schema/ConcertState";
import { MapSchema } from "@colyseus/schema";

const CLUB_BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -20,
  maxZ: 20,
};

const EMOTE_DURATION_MS = 2800;
const CHAT_DURATION_MS = 4500;
const HYPE_COOLDOWN_MS = 12000;
const HYPE_DURATION_MS = 7000;
const PARTY_DURATION_MS = 15000;
const ENERGY_DECAY_PER_SECOND = 1.5;

const REACTION_EMOJIS = new Set(["❤️", "🔥", "🎉", "⚡", "👏", "😂"]);

// Voice lounge seats — must match web/lib/clubLayout.ts VOICE_LOUNGE.
const VOICE_LOUNGE_CENTER = { x: 8, z: 13 };
const VOICE_SEAT_COUNT = 6;
const VOICE_SEAT_RADIUS = 2.3;
const VOICE_SEATS = Array.from({ length: VOICE_SEAT_COUNT }, (_, i) => {
  const angle = (i / VOICE_SEAT_COUNT) * Math.PI * 2;
  const x = VOICE_LOUNGE_CENTER.x + Math.cos(angle) * VOICE_SEAT_RADIUS;
  const z = VOICE_LOUNGE_CENTER.z + Math.sin(angle) * VOICE_SEAT_RADIUS;
  return {
    x,
    z,
    rotY: Math.atan2(VOICE_LOUNGE_CENTER.x - x, VOICE_LOUNGE_CENTER.z - z),
  };
});

type JoinOptions = {
  userId: string;
  name: string;
  gender: string;
  color: string;
  shirt: string;
  pants: string;
  shoes: string;
  style: string;
};

type MoveMessage = {
  type: "move";
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: "idle" | "walk";
};

type EmoteMessage = {
  type: "emote";
  emote: "dance" | "wave" | "cheer" | "pose";
};

type ChatMessage = {
  type: "chat";
  text: string;
};

type HypeMessage = {
  type: "hype";
};

type ReactionMessage = {
  type: "reaction";
  emoji: string;
};

type SitMessage = {
  type: "sit";
  seatIndex: number;
};

type VoiceSignalMessage = {
  type: "voice";
  to: string;
  data: unknown;
};

const VALID_EMOTES = new Set(["dance", "wave", "cheer", "pose"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export class ConcertRoom extends Room<ConcertState> {
  maxClients = 80;
  private lastHypeAt = 0;

  onCreate() {
    const state = new ConcertState();
    state.players = new MapSchema<Player>();
    state.dropUntil = 0;
    state.energy = 0;
    state.partyUntil = 0;
    this.setState(state);

    // Crowd energy slowly cools off so the meter stays meaningful.
    this.clock.setInterval(() => {
      if (this.state.energy > 0) {
        this.state.energy = Math.max(
          0,
          this.state.energy - ENERGY_DECAY_PER_SECOND,
        );
      }
    }, 1000);

    this.onMessage("move", (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Moving while seated stands the player up (leaves voice chat).
      if (player.seat >= 0) {
        player.seat = -1;
      }

      player.x = clamp(message.x, CLUB_BOUNDS.minX, CLUB_BOUNDS.maxX);
      player.y = 0;
      player.z = clamp(message.z, CLUB_BOUNDS.minZ, CLUB_BOUNDS.maxZ);
      player.rotY = message.rotY;

      const isEmote = ["dance", "wave", "cheer", "pose"].includes(player.anim);
      if (!isEmote) {
        player.anim = message.anim;
      }
    });

    this.onMessage("emote", (client, message: EmoteMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !VALID_EMOTES.has(message.emote)) return;

      player.anim = message.emote;

      // Emotes feed the crowd meter; group dancing feeds it faster.
      let gain = 8;
      if (message.emote === "dance") {
        let dancers = 0;
        this.state.players.forEach((entry) => {
          if (entry.anim === "dance") dancers += 1;
        });
        if (dancers >= 2) gain += 6;
      }
      this.addEnergy(gain);

      this.clock.setTimeout(() => {
        if (player.anim === message.emote) {
          player.anim = player.seat >= 0 ? "sit" : "idle";
        }
      }, EMOTE_DURATION_MS);
    });

    this.onMessage("chat", (client, message: ChatMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const text = message.text.trim().slice(0, 40);
      if (!text) return;

      player.chat = text;
      this.addEnergy(4);
      this.clock.setTimeout(() => {
        if (player.chat === text) {
          player.chat = "";
        }
      }, CHAT_DURATION_MS);
    });

    this.onMessage("reaction", (client, message: ReactionMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !REACTION_EMOJIS.has(message.emoji)) return;

      this.addEnergy(2);
      this.broadcast("reaction", {
        emoji: message.emoji,
        name: player.name,
        sessionId: client.sessionId,
      });
    });

    this.onMessage("sit", (client, message: SitMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const seatIndex = Math.floor(message.seatIndex);
      if (seatIndex < 0 || seatIndex >= VOICE_SEATS.length) return;

      // Reject if someone else is already on that seat.
      let taken = false;
      this.state.players.forEach((entry) => {
        if (entry !== player && entry.seat === seatIndex) taken = true;
      });
      if (taken) return;

      const seat = VOICE_SEATS[seatIndex];
      player.seat = seatIndex;
      player.x = seat.x;
      player.z = seat.z;
      player.rotY = seat.rotY;
      player.anim = "sit";
    });

    this.onMessage("stand", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.seat < 0) return;

      player.seat = -1;
      player.anim = "idle";
    });

    // Relay WebRTC signaling (offers/answers/ICE) between seated players.
    this.onMessage("voice", (client, message: VoiceSignalMessage) => {
      const sender = this.state.players.get(client.sessionId);
      if (!sender || sender.seat < 0 || typeof message.to !== "string") return;

      const recipient = this.state.players.get(message.to);
      if (!recipient || recipient.seat < 0) return;

      const target = this.clients.find(
        (entry) => entry.sessionId === message.to,
      );
      target?.send("voice", { from: client.sessionId, data: message.data });
    });

    this.onMessage("hype", (_client, _message: HypeMessage) => {
      const now = Date.now();
      if (now - this.lastHypeAt < HYPE_COOLDOWN_MS) return;

      this.lastHypeAt = now;
      this.state.dropUntil = now + HYPE_DURATION_MS;
      this.addEnergy(20);
    });

    // Legacy dance message for older clients
    this.onMessage("dance", (client, _message: { type: "dance" }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.anim = "dance";
      this.clock.setTimeout(() => {
        if (player.anim === "dance") {
          player.anim = "idle";
        }
      }, EMOTE_DURATION_MS);
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.userId = options.userId;
    player.name = options.name.slice(0, 24);
    player.color = options.color.slice(0, 7);
    player.shirt = (options.shirt ?? "neon-jacket").slice(0, 24);
    player.pants = (options.pants ?? "cargo").slice(0, 24);
    player.shoes = (options.shoes ?? "high-tops").slice(0, 24);
    player.style = (options.style ?? "cyber").slice(0, 24);
    player.gender = options.gender === "female" ? "female" : "male";
    player.x = (Math.random() - 0.5) * 4;
    player.z = 5 + Math.random() * 3;
    player.rotY = Math.PI;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  /** Fill the shared crowd meter; at 100% the whole club enters Party Mode. */
  private addEnergy(amount: number) {
    const now = Date.now();
    this.state.energy = Math.min(100, this.state.energy + amount);

    if (this.state.energy >= 100 && now > this.state.partyUntil) {
      this.state.partyUntil = now + PARTY_DURATION_MS;
      this.state.energy = 30;
    }
  }
}
