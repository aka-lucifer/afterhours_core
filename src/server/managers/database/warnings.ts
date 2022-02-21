import * as Database from "./database";
import {Server} from "../../server"

import {Warning} from "../../models/database/warning";

import {Log} from "../../utils"
import {Events} from "../../../shared/enums/events";
import {Ranks} from "../../../shared/enums/ranks";
import {FormattedWarning} from "../../../client/models/ui/warning";

export class WarnManager {
  public server: Server;
  private playerWarnings: Warning[] = [];

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.requestWarnings, this.EVENT_requestWarnings.bind(this));
  }

  // Get Requests
  public get GetWarnings(): Warning[] {
    return this.playerWarnings;
  }

  // Methods
  public async loadWarnings(): Promise<void> {
    const warnData = await Database.SendQuery("SELECT * FROM `player_warnings`", {});
    for (let i = 0; i < Object.keys(warnData.data).length; i++) {
      const warning = new Warning(warnData.data[i].player_id, warnData.data[i].reason, warnData.data[i].issued_by);
      warning.Id = warnData.data[i].id;
      warning.IssuedOn = new Date(warnData.data[i].issued_on);
      this.playerWarnings.push(warning);
    }

    // console.log("All Player Warnings", this.playerWarnings);
  }

  public Add(warnData: Warning): number {
    const addedData = this.playerWarnings.push(warnData);
    if (this.server.IsDebugging) Log("Warn Manager | Added", `(Id: ${warnData.Id} | Player Id: ${warnData.PlayerId} | Reason: ${warnData.Reason} | Warners Id: ${!warnData.systemWarning ? warnData.Warner.Id : "System"})`);
    return addedData;
  }

  public async GetWarning(warnId: number): Promise<Warning> {
    const warnIndex = this.playerWarnings.findIndex(warning => warning.Id == warnId);
    if (warnIndex != -1) {
      return this.playerWarnings[warnIndex];
    }
  }

  public async getPlayerWarnings(playerId: number): Promise<Warning[]> {
    const playerWarnings = [];

    for (let i = 0; i < this.playerWarnings.length; i++) {
      if (this.playerWarnings[i].PlayerId == playerId) {
        playerWarnings.push(this.playerWarnings[i]);
      }
    }

    return playerWarnings;
  }

  // Events
  private async EVENT_requestWarnings(): Promise<void> {
    const receivedWarnings: FormattedWarning[] = [];
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    const warnings = await this.getPlayerWarnings(player.Id);

    for (let i = 0; i < warnings.length; i++) {
      if (!warnings[i].systemWarning) {
        const player = await this.server.playerManager.getPlayerFromId(warnings[i].WarnedBy);
        receivedWarnings.push({
          id: warnings[i].Id,
          issuedBy: `[${Ranks[player.GetRank]}] - ${player.GetName}`,
          reason: warnings[i].Reason,
          issuedOn: warnings[i].IssuedOn.toUTCString()
        });
      } else {
        receivedWarnings.push({
          id: warnings[i].Id,
          issuedBy: "System",
          reason: warnings[i].Reason,
          issuedOn: warnings[i].IssuedOn.toUTCString()
        });
      }
    }

    await player.TriggerEvent(Events.receiveWarnings, receivedWarnings);
  }
}
