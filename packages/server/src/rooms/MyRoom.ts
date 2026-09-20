import { Room, Client } from "colyseus";
import { MyState, Player } from "./MyState";

export class MyRoom extends Room {
  state = new MyState();

  onJoin(client: Client) {
    console.log(client.sessionId, "ist beigetreten");
    this.state.players.set(client.sessionId, new Player());
  }

  onLeave(client: Client) {
    console.log(client.sessionId, "hat verlassen");
    this.state.players.delete(client.sessionId);
  }
}
