import { defineServer, defineRoom, matchMaker } from "colyseus";
import { MyRoom } from "./rooms/MyRoom";
import { KlaxonRoom } from "./rooms/KlaxonRoom";
import { randomTechnobabble } from "@klaxon/shared";

const port = parseInt(process.env.PORT, 10) || 2567;
// Shown on /stats to check after a deploy which build and Node version run (no shell on Render free tier).
const build = { node: process.version, commit: (process.env.RENDER_GIT_COMMIT || "local").slice(0, 7) };

const server = defineServer({
  express: (app: any) => {
    app.get("/health", (_req: any, res: any) => { res.status(200).send("ok"); });
    app.get("/stats", async (_req: any, res: any) => {
      res.header("Access-Control-Allow-Origin", "*");
      try {
        const rooms = await matchMaker.query({ name: "klaxon" });
        const players = rooms.reduce((a: number, r: any) => a + (r.clients || 0), 0);
        res.json({ status: "ok", rooms: rooms.length, players, uptimeSec: Math.round(process.uptime()), ...build });
      } catch {
        res.json({ status: "ok", rooms: 0, players: 0, uptimeSec: Math.round(process.uptime()), ...build });
      }
    });
  },
  rooms: {
    my_room: defineRoom(MyRoom),
    klaxon: defineRoom(KlaxonRoom).filterBy(["code"]),
  },
});

server.listen(port);
console.log(`Colyseus lauscht auf ws://localhost:${port} (Node ${process.version}, shared: ${randomTechnobabble()})`);
