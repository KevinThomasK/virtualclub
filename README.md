# Virtual Concert (3D Multiplayer Starter)

Browser-based 3D concert space where logged-in users appear as avatars, move around a shared stage, and dance together in real time.

## Stack

- **Next.js 14** — app shell + auth
- **NextAuth** — guest login with name + avatar color
- **Colyseus** — WebSocket multiplayer server
- **React Three Fiber + Three.js** — 3D rendering

## Quick start

```bash
npm install
npm run dev
```

This starts:

- Web app: http://localhost:3000
- Colyseus server: ws://localhost:2567

## Try multiplayer

1. Open http://localhost:3000
2. Click **Enter the venue** and sign in with a name
3. Open a **second browser tab** (or incognito window), sign in with another name
4. Both avatars appear on the same stage — move with WASD, dance with Space

## Project layout

```
server/          Colyseus game server + ConcertRoom
web/             Next.js client + React Three Fiber scene
```

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Move left |
| D / → | Move right |
| Space | Dance emote (synced to all players) |

## Next steps

- Replace primitive avatars with [Ready Player Me](https://readyplayer.me) GLB models
- Persist avatar customization in Postgres (Prisma)
- Add synced music/video on the stage
- Deploy game server to Railway/Fly.io (WebSockets need a persistent process)
- Add room sharding when concerts exceed ~80 players

## Environment

Copy `web/.env.local` and set a real secret before production:

```
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_COLYSEUS_URL=ws://your-game-server:2567
```

## Deploy (free): Vercel + Render

The web app runs on Vercel; the Colyseus server needs a persistent process,
so it runs on Render (free plan supports WebSockets).

### 1. Game server → Render

Render must run **only** the Colyseus server — not the Next.js app.

In the Render dashboard for your service (`virtualclub`), set:

| Setting | Value |
|--------|--------|
| **Build Command** | `npm install && npm run build -w server` |
| **Start Command** | `npm start -w server` |

Do **not** use `npm run dev` — that starts both web + server and causes
`EADDRINUSE` on Render’s port.

After deploy, open `https://virtualclub.onrender.com/health` — you should see
`{"ok":true}`.

(Or use the Blueprint in `render.yaml`, which already has the correct commands.)

### 2. Web app → Vercel

1. On [vercel.com](https://vercel.com): **New Project**, import the same repo.
2. Set **Root Directory** to `web` (keep "Include files outside root" enabled —
   needed for npm workspaces).
3. Add environment variables:
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel URL, e.g. `https://your-app.vercel.app`
   - `NEXT_PUBLIC_COLYSEUS_URL` — `wss://virtualclub.onrender.com`
     (**wss://**, not ws:// — the page is HTTPS)
4. Deploy. Mic access for the Voice Lounge works because Vercel serves HTTPS.

### Free-plan caveats

- Render free services **sleep after ~15 min idle**; the first visitor after
  that waits ~50s while it wakes. The `/health` endpoint helps uptime pingers
  (e.g. cron-job.org) keep it warm if you want.
- Voice chat uses peer-to-peer WebRTC with a public STUN server — it works on
  most networks, but users behind very strict NATs would need a TURN server
  (not included; free tiers exist at services like metered.ca).
