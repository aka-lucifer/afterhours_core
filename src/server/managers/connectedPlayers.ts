import { Server } from "../server";
import {Delay, Error, Inform, Log} from "../utils";

import { Player } from "../models/database/player";
import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { LogTypes } from "../enums/logTypes";

import {Ranks} from "../../shared/enums/ranks";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../shared/enums/embedColours";

import serverConfig from "../../configs/server.json";
import sharedConfig from "../../configs/shared.json";

export class ConnectedPlayerManager {
  public server: Server;
  private connectedPlayers: any[] = [];
  
  constructor(server: Server) {
    this.server = server;

    this.processRanks();
  }

  // Get Requests
  public get GetPlayers(): Player[] {
    return this.connectedPlayers;
  }

  // Methods
  private processRanks(): void {
    setInterval(async() => {
      for (let i = 0; i < this.connectedPlayers.length; i++) {
        if (this.connectedPlayers[i].GetPlaytime.days >= 2) {
          if (this.connectedPlayers[i].Rank < Ranks.Honorable && this.connectedPlayers[i].Trustscore >= 90) {
            const oldRank = this.connectedPlayers[i].Rank;
            const updatedRank = this.connectedPlayers[i].UpdateRank(Ranks.Honorable);
            if (updatedRank) {
              await this.connectedPlayers[i].Notify("Rank", "Your rank has been updated to Honorable, due to 2 days playtime & an outstanding trustscore.", NotificationTypes.Success);
              Inform("Player Manager", `Successfully updated player ([${this.connectedPlayers[i].Id}]: ${this.connectedPlayers[i].GetName}) rank to Honorable`);
              
              const playersDisc = await this.connectedPlayers[i].GetIdentifier("discord");
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Rank Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Rank Change__",
                description: `A players rank has automatically been updated due to great playtime & an outstanding trustscore.\n\n**Old Rank**: ${Ranks[oldRank]}\n**New Rank**: ${Ranks[this.connectedPlayers[i].Rank]}\n**Discord**: ${playersDisc != "Unknown" ? `<@${playersDisc}>` : playersDisc}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]}));
            } else {
              Error("Player Manager", `There was an issue updating [${this.connectedPlayers[i].Id}]: ${this.connectedPlayers[i].GetName}'s rank to Honorable!`);
            }
          }
        }
      }
    }, serverConfig.rankCycling.interval * 1000);
  }

  public Add(player: Player): number {
    const addedData = this.connectedPlayers.push(player);
    if (this.server.IsDebugging) Log("Player Manager (Add)", `[${player.Handle}]: ${player.GetName}`);
    return addedData;
  }

  public async Update(newHandle: string, oldHandle: string): Promise<Player> {
    const player = await this.GetPlayer(oldHandle);
    if (player) {
      const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == oldHandle);
      if (playerIndex != -1) {
        player.Handle = newHandle;
        this.connectedPlayers[playerIndex] = player;
        return this.connectedPlayers[playerIndex];
      }
    }
  }

  public async GetPlayer(playerHandle: string): Promise<Player> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    if (playerIndex != -1) {
      return this.connectedPlayers[playerIndex];
    }
  }

  public async GetPlayerFromId(playerId: number): Promise<Player> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Id == playerId);
    if (playerIndex != -1) {
      return this.connectedPlayers[playerIndex];
    }
  }

  public async Exists(license: string): Promise<boolean> {
    let result = false;

    for (let i = 0; i < this.connectedPlayers.length; i++) {
      // console.log("player license", await this.connectedPlayers[i].GetIdentifier("license"), license);
      if (await this.connectedPlayers[i].GetIdentifier("license") == license) {
        result = true;
      }
    }

    return result;
  }

  public async Disconnect(playerHandle: string, disconnectReason: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    if (playerIndex != -1) {
      const player: Player = this.connectedPlayers[playerIndex];
      const name = player.GetName;
      const tempData = `[${player.Handle}] - ${name}`;

      // Change Name Detection
      const disconnectIndex = this.server.connectionsManager.disconnectedPlayers.findIndex(connectedPlayer => connectedPlayer.name == name);
      if (disconnectIndex == -1) {
        const license = await player.GetIdentifier("license");
        const ip = await player.GetIdentifier("ip");
        const hardwareId = player.HardwareId;

        this.server.connectionsManager.disconnectedPlayers.push({
          name: name,
          license: license,
          ip: ip,
          hardwareId: hardwareId
        });
      }

      if (player) {
        this.server.characterManager.Disconnect(player);
        await player.Disconnect(disconnectReason);
      }
      
      this.connectedPlayers.splice(playerIndex, 1);
      Inform("Player Manager", `${tempData} | Removed from player manager!`);
    }
  }

  public async Remove(playerHandle: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    if (playerIndex != -1) {
      this.connectedPlayers.splice(playerIndex, 1);
    }
  }
}
