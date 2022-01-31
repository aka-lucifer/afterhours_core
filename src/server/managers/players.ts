import { Server } from "../server";
import { Player } from "../models/database/player";
import { Log } from "../utils";

export class PlayerManager {
  public server: Server;
  private connectedPlayers: any[] = [];
  
  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetPlayers(): Player[] {
    return this.connectedPlayers;
  }

  // Methods
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

  public async Remove(playerHandle: string, disconnectReason: string): Promise<void> {
    const playerIndex = this.connectedPlayers.findIndex(player => player.GetHandle == playerHandle);
    if (playerIndex != -1) {
      const player = await this.GetPlayer(playerHandle);
      if (player) {
        await player.Disconnect(disconnectReason)
      }
      this.connectedPlayers.splice(playerIndex, 1);
    }
  }
}
