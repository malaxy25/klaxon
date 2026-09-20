import { defineServer, defineRoom } from "colyseus";
import { MyRoom } from "./rooms/MyRoom";
import { SpaceteamRoom } from "./rooms/SpaceteamRoom";
import { randomTechnobabble } from "@spaceteam/shared";

const port = parseInt(process.env.PORT, 10) || 2567;

const server = defineServer({
  rooms: {
    my_room: defineRoom(MyRoom),
    spaceteam: defineRoom(SpaceteamRoom),
  },
});

server.listen(port);
console.log(`Colyseus lauscht auf ws://localhost:${port} (shared: ${randomTechnobabble()})`);