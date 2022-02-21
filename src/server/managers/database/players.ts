import {DBPlayer} from "../../models/database/dbPlayer";
import {Server} from "../../server";

import * as Database from "./database";

export class PlayerManager {
  private server: Server;
  private players: DBPlayer[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public async init(): Promise<void> {
    const players = await Database.SendQuery("SELECT * FROM `players`", {});

    for (let i = 0; i < players.data.length; i++) {
      this.players.push(new DBPlayer(players.data[i]))
    }
  }

  public async getPlayerFromId(playerId: number): Promise<DBPlayer> {
    const playerIndex = this.players.findIndex(player => player.Id == playerId);
    if (playerId != -1) {
      return this.players[playerIndex];
    }
  }
}
