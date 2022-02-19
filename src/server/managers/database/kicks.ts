import {Kick} from "../../models/database/kick";

import * as Database from "./database";
import {Server} from "../../server"

import {Log} from "../../utils"

export class KickManager {
  public server: Server;
  private kickedPlayers: Kick[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetKicks(): Kick[] {
    return this.kickedPlayers;
  }

  // Methods
  public async loadKicks(): Promise<void> {
    const kickData = await Database.SendQuery("SELECT * FROM `player_kicks`", {});
    for (let i = 0; i < Object.keys(kickData.data).length; i++) {
      const kick = new Kick(kickData.data[i].player_id, kickData.data[i].reason, kickData.data[i].issued_by);
      kick.Id = kickData.data[i].id;
      kick.IssuedOn = new Date(kickData.data[i].issued_on);
      this.kickedPlayers.push(kick);
    }
  }

  public Add(kickData: Kick): number {
    const addedData = this.kickedPlayers.push(kickData);
    if (this.server.IsDebugging) Log("Kick Manager | Added", `(Id: ${kickData.Id} | Player Id: ${kickData.PlayerId} | Reason: ${kickData.Reason} | Kickers Id: ${!kickData.systemKick ? kickData.Kicker.Id : "System"})`);
    return addedData;
  }

  public async GetKick(kickId: number): Promise<Kick> {
    const kickIndex = this.kickedPlayers.findIndex(kick => kick.Id == kickId);
    if (kickIndex != -1) {
      return this.kickedPlayers[kickIndex];
    }
  }
}
