import * as Database from "./database";
import {Server} from "../../server"

import {Commend} from "../../models/database/commend";

export class CommendManager {
  public server: Server;
  private playerCommends: Commend[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetWarnings(): Commend[] {
    return this.playerCommends;
  }

  // Methods
  public async loadCommends(): Promise<void> {
    const commendData = await Database.SendQuery("SELECT * FROM `player_commends`", {});
    for (let i = 0; i < Object.keys(commendData.data).length; i++) {
      const commend = new Commend(commendData.data[i].id, commendData.data[i].player_id, commendData.data[i].reason, commendData.data[i].issued_by, new Date(commendData.data[i].issued_on));
      this.playerCommends.push(commend);
    }

    // console.log("All Player Commends", this.playerCommends);
  }

  public async GetCommend(commendId: number): Promise<Commend> {
    const warnIndex = this.playerCommends.findIndex(warning => warning.Id == commendId);
    if (warnIndex != -1) {
      return this.playerCommends[warnIndex];
    }
  }

  public async getPlayerCommends(playerId: number): Promise<Commend[]> {
    const commends = [];

    for (let i = 0; i < this.playerCommends.length; i++) {
      if (this.playerCommends[i].Receiver == playerId) {
        commends.push(this.playerCommends[i]);
      }
    }

    return commends;
  }
}
