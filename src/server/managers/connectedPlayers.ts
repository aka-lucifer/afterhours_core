import { Server } from '../server';
import { Delay, Error, Inform, Log } from '../utils';

import { Player } from "../models/database/player";
import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { LogTypes } from "../enums/logging";

import {Ranks} from "../../shared/enums/ranks";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { Events } from "../../shared/enums/events/events";
import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";

import serverConfig from "../../configs/server.json";
import sharedConfig from "../../configs/shared.json";
import { Message } from '../../shared/models/ui/chat/message';
import { SystemTypes } from '../../shared/enums/ui/chat/types';

export class ConnectedPlayerManager {
  public server: Server;
  public connectedPlayers: any[] = [];

  // Ticks
  private pingTick: number = undefined;
  
  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetPlayers(): Player[] {
    return this.connectedPlayers;
  }

  // Methods
  private processRanks(): void {
    // console.log("process ranks")
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

  private processPing(): void {
    if (this.pingTick === undefined) this.pingTick = setTick(async() => {
      for (let i = 0; i < this.connectedPlayers.length; i++) {
        if (this.connectedPlayers[i].Spawned) {
          if (this.connectedPlayers[i].Rank < Ranks.Moderator) { // If they aren't staff
            const newPing = this.connectedPlayers[i].RefreshPing();

            if (newPing > serverConfig.maxPing) { // If their ping is greater than the max ping, kick them
              DropPlayer(this.connectedPlayers[i].Handle, `\n__[${sharedConfig.serverName}]__: You were kicked from ${sharedConfig.serverName} for having too high ping. (Ping: ${newPing})`);
            }
          }
        }
      }

      await Delay(1000);
    });
  }

  public init(): void {
    this.processRanks();
    this.processPing();
  }

  public async Add(player: Player): Promise<number> {
    const addedData = this.connectedPlayers.push(player);
    if (this.server.IsDebugging) Log("Player Manager (Add)", `[${player.Handle}]: ${player.GetName}`);

    for (let i = 0; i < this.connectedPlayers.length; i++) {
      if (this.connectedPlayers[i].Spawned) await this.connectedPlayers[i].TriggerEvent(Events.syncPlayers, Object.assign({}, this.connectedPlayers));
    }
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
    for (let i = 0; i < this.connectedPlayers.length; i++) {
      if (await this.connectedPlayers[i].GetIdentifier === license) {
        return true;
      }
    }

    return false;
  }

  public async playerConnected(playerHandle: string): Promise<boolean> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    return playerIndex !== -1;
  }

  public async Disconnect(playerHandle: string, disconnectReason: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    if (playerIndex != -1) {
      const player: Player = this.connectedPlayers[playerIndex];
      const name = player.GetName;
      const license = await player.GetIdentifier("license");
      const tempData = `[${player.Handle}] - ${name}`;

      // Change Name Detection
      const disconnectIndex = this.server.connectionsManager.disconnectedPlayers.findIndex(connectedPlayer => connectedPlayer.license === license);
      if (disconnectIndex === -1) {
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
        emitNet(JobEvents.deleteOffDutyUnit, -1, player.Handle); // Remove this players on duty blip to all on duty players
        emitNet(Events.deleteLeftPlayer, -1, player.Handle); // Remove this players blip to all staff members, showing players blips
        await this.server.staffManager.ghostPlayers.playerLeft(player); // Create this ped as a ghost ped
        await this.server.priority.Remove(player); // Remove player from active unit if he exists and update priority
        await this.server.staffManager.gravityGun.checkDetaching(player.Handle);
        await this.server.jobManager.policeJob.grabbing.checkReleasing(player.Handle);
        await this.server.carrying.checkReleasing(player.Handle);
        await this.server.jobManager.Disconnect(player);
        this.server.characterManager.Disconnect(player);
        
        emitNet(Events.sendSystemMessage, -1,
          new Message(`[^3${player.FormattedRank}^0] - ^3${player.GetName} ^0has left ^3${sharedConfig.serverName} ^0(^1${disconnectReason}^0)`,
        SystemTypes.Admin));
        await player.Disconnect(disconnectReason);
      }
      
      this.connectedPlayers.splice(playerIndex, 1);
      emitNet(Events.syncPlayers, -1, Object.assign({}, this.connectedPlayers));
      Inform("Player Manager", `${tempData} | Removed from player manager!`);
    }
  }

  public async Remove(playerHandle: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.Handle == playerHandle);
    if (playerIndex != -1) {
      this.connectedPlayers.splice(playerIndex, 1);
      emitNet(Events.syncPlayers, -1, Object.assign({}, this.connectedPlayers));
    }
  }
}