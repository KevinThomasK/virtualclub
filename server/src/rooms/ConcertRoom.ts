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
const DANCE_SYNC_WINDOW_MS = 1000;
const DANCE_SYNC_COOLDOWN_MS = 4000;
const PHOTO_COOLDOWN_MS = 5000;
const DJ_MODE_DURATION_MS = 15000;
const DJ_VOTE_THRESHOLD = 2;

const REACTION_EMOJIS = new Set(["❤️", "🔥", "🎉", "⚡", "👏", "😂"]);
const DJ_STYLES = new Set(["bass", "chill", "hyper"]);

const DANCE_FLOOR = { x: 0, z: -2, radius: 7 };
const PHOTO_WALL = { x: 16, z: 14, radius: 5.5 };
const DJ_ZONE = { x: 0, z: -14, radius: 8 };

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

// Chill lounge couch — indices 10+ so they never collide with voice seats.
const LOUNGE_SEAT_OFFSET = 10;
const LOUNGE_ORIGIN = { x: -16, z: 14 };
const LOUNGE_SEATS = [
  { x: LOUNGE_ORIGIN.x - 1.4, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
  { x: LOUNGE_ORIGIN.x, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
  { x: LOUNGE_ORIGIN.x + 1.4, z: LOUNGE_ORIGIN.z + 0.15, rotY: 0 },
];

function isVoiceSeat(seat: number) {
  return seat >= 0 && seat < VOICE_SEAT_COUNT;
}

function isLoungeSeat(seat: number) {
  return (
    seat >= LOUNGE_SEAT_OFFSET &&
    seat < LOUNGE_SEAT_OFFSET + LOUNGE_SEATS.length
  );
}

function seatedAnim(seat: number) {
  if (isLoungeSeat(seat)) return "chill";
  if (isVoiceSeat(seat)) return "sit";
  return "idle";
}

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

type DjVoteMessage = {
  type: "djVote";
  style: "bass" | "chill" | "hyper";
};

type PhotoMessage = {
  type: "photo";
};

const VALID_EMOTES = new Set(["dance", "wave", "cheer", "pose"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inRadius(
  player: Player,
  zone: { x: number; z: number; radius: number },
) {
  const dx = player.x - zone.x;
  const dz = player.z - zone.z;
  return dx * dx + dz * dz <= zone.radius * zone.radius;
}

export class ConcertRoom extends Room<ConcertState> {
  maxClients = 80;
  private lastHypeAt = 0;
  private lastDanceSyncAt = 0;
  private recentDances: { sessionId: string; name: string; at: number }[] = [];
  private lastPhotoAt = new Map<string, number>();
  private djVotes = new Map<string, "bass" | "chill" | "hyper">();

  onCreate() {
    const state = new ConcertState();
    state.players = new MapSchema<Player>();
    state.dropUntil = 0;
    state.energy = 0;
    state.partyUntil = 0;
    state.djMode = "";
    state.djModeUntil = 0;
    state.votesBass = 0;
    state.votesChill = 0;
    state.votesHyper = 0;
    this.setState(state);

    // Crowd energy slowly cools off so the meter stays meaningful.
    this.clock.setInterval(() => {
      if (this.state.energy > 0) {
        this.state.energy = Math.max(
          0,
          this.state.energy - ENERGY_DECAY_PER_SECOND,
        );
      }
      // Clear expired DJ mode.
      if (this.state.djMode && Date.now() > this.state.djModeUntil) {
        this.state.djMode = "";
        this.state.djModeUntil = 0;
      }
    }, 1000);

    this.onMessage("move", (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Moving while seated stands the player up — but ignore tiny jitter /
      // stale move packets that arrive right after a sit ack (otherwise G-to-sit
      // looks like "nothing happened").
      if (player.seat >= 0) {
        const dx = message.x - player.x;
        const dz = message.z - player.z;
        const moved = dx * dx + dz * dz > 0.22 * 0.22;
        if (!moved && message.anim !== "walk") {
          return;
        }
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
        this.tryDanceSync(client.sessionId, player);
      }
      this.addEnergy(gain);

      this.clock.setTimeout(() => {
        if (player.anim === message.emote) {
          player.anim = seatedAnim(player.seat);
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

    this.onMessage("photo", (client, _message: PhotoMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("photoAck", { ok: false, reason: "invalid" });
        return;
      }
      if (!inRadius(player, PHOTO_WALL)) {
        client.send("photoAck", { ok: false, reason: "too_far" });
        return;
      }

      const now = Date.now();
      const last = this.lastPhotoAt.get(client.sessionId) ?? 0;
      if (now - last < PHOTO_COOLDOWN_MS) {
        client.send("photoAck", {
          ok: false,
          reason: "cooldown",
          waitMs: PHOTO_COOLDOWN_MS - (now - last),
        });
        return;
      }
      this.lastPhotoAt.set(client.sessionId, now);

      player.anim = "pose";
      this.addEnergy(6);
      this.broadcast("photoFlash", {
        name: player.name,
        sessionId: client.sessionId,
        x: player.x,
        z: player.z,
      });
      client.send("photoAck", { ok: true });

      this.clock.setTimeout(() => {
        if (player.anim === "pose") {
          player.anim = seatedAnim(player.seat);
        }
      }, EMOTE_DURATION_MS);
    });

    this.onMessage("djVote", (client, message: DjVoteMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !DJ_STYLES.has(message.style)) {
        client.send("djVoteAck", {
          ok: false,
          reason: "invalid",
        });
        return;
      }

      if (this.state.djMode && Date.now() < this.state.djModeUntil) {
        client.send("djVoteAck", {
          ok: false,
          reason: "drop_live",
          style: this.state.djMode,
        });
        return;
      }

      if (!inRadius(player, DJ_ZONE)) {
        client.send("djVoteAck", {
          ok: false,
          reason: "too_far",
        });
        return;
      }

      this.djVotes.set(client.sessionId, message.style);
      this.recountDjVotes();
      client.send("djVoteAck", {
        ok: true,
        style: message.style,
        votes: {
          bass: this.state.votesBass,
          chill: this.state.votesChill,
          hyper: this.state.votesHyper,
        },
      });
      this.tryResolveDjVote(player.name);
    });

    this.onMessage("sit", (client, message: SitMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const seatIndex = Math.floor(message.seatIndex);
      let seat: { x: number; z: number; rotY: number } | undefined;

      if (isVoiceSeat(seatIndex)) {
        seat = VOICE_SEATS[seatIndex];
      } else if (isLoungeSeat(seatIndex)) {
        seat = LOUNGE_SEATS[seatIndex - LOUNGE_SEAT_OFFSET];
      } else {
        return;
      }

      // Reject if someone else is already on that seat.
      let taken = false;
      this.state.players.forEach((entry) => {
        if (entry !== player && entry.seat === seatIndex) taken = true;
      });
      if (taken) return;

      player.seat = seatIndex;
      player.x = seat.x;
      player.z = seat.z;
      player.rotY = seat.rotY;
      player.anim = seatedAnim(seatIndex);
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
      this.tryDanceSync(client.sessionId, player);
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
    this.lastPhotoAt.delete(client.sessionId);
    if (this.djVotes.delete(client.sessionId)) {
      this.recountDjVotes();
    }
  }

  /** Two+ dancers on the floor within ~1s → Synced! broadcast + energy spike. */
  private tryDanceSync(sessionId: string, player: Player) {
    if (!inRadius(player, DANCE_FLOOR)) return;

    const now = Date.now();
    this.recentDances.push({
      sessionId,
      name: player.name,
      at: now,
    });
    this.recentDances = this.recentDances.filter(
      (entry) => now - entry.at <= DANCE_SYNC_WINDOW_MS,
    );

    const unique = new Map<string, string>();
    for (const entry of this.recentDances) {
      unique.set(entry.sessionId, entry.name);
    }
    if (unique.size < 2) return;
    if (now - this.lastDanceSyncAt < DANCE_SYNC_COOLDOWN_MS) return;

    this.lastDanceSyncAt = now;
    this.recentDances = [];
    this.addEnergy(22);
    this.broadcast("danceSync", {
      names: Array.from(unique.values()).slice(0, 6),
      count: unique.size,
    });
  }

  private recountDjVotes() {
    let bass = 0;
    let chill = 0;
    let hyper = 0;
    this.djVotes.forEach((style) => {
      if (style === "bass") bass += 1;
      else if (style === "chill") chill += 1;
      else hyper += 1;
    });
    this.state.votesBass = bass;
    this.state.votesChill = chill;
    this.state.votesHyper = hyper;
  }

  private tryResolveDjVote(voterName: string) {
    const { votesBass, votesChill, votesHyper } = this.state;
    const total = votesBass + votesChill + votesHyper;
    // Alone in the club: one click is enough to demo the drop.
    // With friends: need at least 2 votes and a clear lead.
    const threshold = this.state.players.size <= 1 ? 1 : DJ_VOTE_THRESHOLD;
    if (total < threshold) return;

    const ranked: Array<{ style: "bass" | "chill" | "hyper"; votes: number }> = [
      { style: "bass" as const, votes: votesBass },
      { style: "chill" as const, votes: votesChill },
      { style: "hyper" as const, votes: votesHyper },
    ].sort((a, b) => b.votes - a.votes);

    const winner = ranked[0];
    const runner = ranked[1];
    if (winner.votes < threshold) return;
    if (this.state.players.size > 1 && winner.votes === runner.votes) return;

    const now = Date.now();
    this.state.djMode = winner.style;
    this.state.djModeUntil = now + DJ_MODE_DURATION_MS;
    this.djVotes.clear();
    this.recountDjVotes();
    this.addEnergy(18);

    this.broadcast("djDrop", {
      style: winner.style,
      votes: winner.votes,
      by: voterName,
    });
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
