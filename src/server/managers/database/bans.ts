import {Ban} from "../../models/database/ban";

import * as Database from "./database";
import {Server} from "../../server"

import {Log} from "../../utils"
import {BanStates} from "../../enums/database/bans";
import {Player} from "../../models/database/player";

export class BanManager {
  public server: Server;
  private bannedPlayers: any[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetBans(): Ban[] {
    return this.bannedPlayers;
  }

  // Methods
  public async loadBans(): Promise<void> {
    const banData = await Database.SendQuery("SELECT * FROM `player_bans`", {});
    for (let i = 0; i < Object.keys(banData.data).length; i++) {
      const ban = new Ban(banData.data[i].player_id, banData.data[i].hardware_id, banData.data[i].reason, banData.data[i].issued_by, new Date(banData.data[i].issued_until));
      ban.Id = banData.data[i].id;
      ban.State = banData.data[i].ban_state;
      ban.IssuedOn = new Date(banData.data[i].issued_on);
      this.bannedPlayers.push(ban);
    }
  }

  public processBans(): void {
    setInterval(() => { // Check bans every 5 seconds
      this.bannedPlayers.forEach(async(bannedData: Ban, index) => {
        if (bannedData.State == BanStates.Active) {
          if (new Date() > new Date(bannedData.IssuedUntil)) { // Ban Over Now
            const removedBan = await bannedData.remove();
            if (removedBan) {
              bannedData.State = BanStates.Completed;
              this.bannedPlayers.splice(index, 1);
            }
          }
        }
      });
    }, 5000);
  }


  public Add(banData: Ban): number {
    const addedData = this.bannedPlayers.push(banData);
    if (this.server.IsDebugging) Log("Ban Manager | Added", `(Id: ${banData.Id} | Player Id: ${banData.PlayerId} | Reason: ${banData.Reason} | Until: ${banData.IssuedUntil.toUTCString()}`);
    return addedData;
  }

  public async GetBan(banId: number): Promise<Ban> {
    const banIndex = this.bannedPlayers.findIndex(ban => ban.Id == banId);
    if (banIndex != -1) {
      return this.bannedPlayers[banIndex];
    }
  }

  public async playerBanned(player: Player): Promise<[boolean, Ban]> {
    const banIndex = this.bannedPlayers.findIndex(ban => ban.PlayerId == player.Id && ban.State == BanStates.Active);

    if (banIndex != -1) {
      return [true, this.bannedPlayers[banIndex]];
    }

    return [false, null];
  }
}
