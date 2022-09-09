import {Ban} from "../../models/database/ban";

import * as Database from "./database";
import {Server} from "../../server"
import {Log} from "../../utils"

import {BanStates} from "../../../shared/enums/bans";

import {Player} from "../../models/database/player";
import { DBPlayer } from "../../models/database/dbPlayer";

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
        if (bannedData.State === BanStates.Active) {
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
    if (this.server.IsDebugging) Log("Ban Manager | Added", `(Id: ${banData.Id} | Player Id: ${banData.ReceiverId} | Reason: ${banData.Reason} | Until: ${banData.IssuedUntil.toUTCString()}`);
    return addedData;
  }

  public Remove(banId: number): boolean {
    const banIndex = this.bannedPlayers.findIndex(ban => ban.Id == banId);
    if (banIndex !== -1) {
      this.bannedPlayers.splice(banIndex, 1);
    }

    return banIndex !== -1;
  }

  public async Delete(player: DBPlayer | Player, banId: number): Promise<boolean> {
    const deletedBans = await Database.SendQuery("DELETE FROM `player_bans` WHERE `id` = :id AND `player_id` = :playerId", {
      id: banId,
      playerId: player.Id
    });

    if (deletedBans.meta.affectedRows > 0) {
      if (this.server.IsDebugging) Log("Ban Manager | Deleting", `(Id: ${banId} | Player Id: ${player.Id} | Name: ${player.GetName})`);
      return this.server.banManager.Remove(banId);
    } else {
      return false;
    }
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
