import { defineServer, defineRoom } from "colyseus";
import { MyRoom } from "./rooms/MyRoom";
import { KlaxonRoom } from "./rooms/KlaxonRoom";
import { randomTechnobabble } from "@klaxon/shared";

const port = parseInt(process.env.PORT, 10) || 2567;

const server = defineServer({
  express: (app: any) => {
    app.get("/health", (_req: any, res: any) => { res.status(200).send("ok"); });
  },
  rooms: {
    my_room: defineRoom(MyRoom),
    klaxon: defineRoom(KlaxonRoom).filterBy(["code"]),
  },
});

server.listen(port);
console.log(`Colyseus lauscht auf ws://localhost:${port} (shared: ${randomTechnobabble()})`);
