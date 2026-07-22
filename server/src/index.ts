import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { ConcertRoom } from "./rooms/ConcertRoom";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("concert", ConcertRoom);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Colyseus server listening on 0.0.0.0:${PORT}`);
});
