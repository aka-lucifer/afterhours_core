import { Server } from "../server";
import {Error, Inform, Log} from "../utils";

import { Player } from "../models/database/player";

import {Ranks} from "../../shared/enums/ranks";
import serverConfig from "../../configs/server.json";

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
        if (this.connectedPlayers[i].Rank < Ranks.Honorable && this.connectedPlayers[i].Trustscore >= 90) {
          const updatedRank = this.connectedPlayers[i].UpdateRank(Ranks.Honorable);
          if (updatedRank) {
            Inform("Player Manager", "Successfully updated players rank to Honorable");
          } else {
            Error("Player Manager", `There was an issue updating [${this.connectedPlayers[i].Id}]: ${this.connectedPlayers[i].GetName}'s rank to Honorable!`);
          }
        }
      }
    }, serverConfig.rankCycling.interval);
  }

  public Add(player: Player): number {
    const addedData = this.connectedPlayers.push(player);
    if (this.server.IsDebugging) Log("Player Manager (Add)", `[${player.GetHandle}]: ${player.GetName}`);
    return addedData;
  }

  public async Update(newHandle: string, oldHandle: string): Promise<Player> {
    const player = await this.GetPlayer(oldHandle);
    if (player) {
      const playerIndex = this.connectedPlayers.findIndex(player => player.GetHandle == oldHandle);
      if (playerIndex != -1) {
        player.SetHandle = newHandle;
        this.connectedPlayers[playerIndex] = player;
        return this.connectedPlayers[playerIndex];
      }
    }
  }

  public async GetPlayer(playerHandle: string): Promise<Player> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.GetHandle == playerHandle);
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

  public async Disconnect(playerHandle: string, disconnectReason: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.GetHandle == playerHandle);
    if (playerIndex != -1) {
      const player = await this.GetPlayer(playerHandle);
      const name = player.GetName;
      const tempData = `[${player.GetHandle}] - ${name}`;

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
        await this.server.characterManager.Disconnect(player.GetHandle);
        await player.Disconnect(disconnectReason);
      }
      this.connectedPlayers.splice(playerIndex, 1);
      Inform("Player Manager", `${tempData} | Removed from player manager!`);
    }
  }

  public async Remove(playerHandle: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.GetHandle == playerHandle);
    if (playerIndex != -1) {
      this.connectedPlayers.splice(playerIndex, 1);
    }
  }
}
