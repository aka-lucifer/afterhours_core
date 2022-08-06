import { Vector3 } from "fivem-js";

import { Server } from "../../server";

import { Player } from "../../models/database/player";

import { Ranks } from "../../../shared/enums/ranks";
import { Events } from "../../../shared/enums/events/events";

import serverConfig from "../../../configs/server.json";

interface LeftPlayer {
  netId: string,
  license: string,
  position: Vector3
}

export class GhostPlayers {
  private server: Server;

  private leftPlayers: LeftPlayer[] = [];

  constructor(server: Server) {
    this.server = server;

    RegisterCommand("test_player_leave", async() => {
      const player = await this.server.connectedPlayerManager.GetPlayer("10");
      if (player) {
        await this.playerLeft(player);
      }
    }, false);
  }

  // Methods
  public async playerLeft(player: Player): Promise<void> {
    const playersPed = GetPlayerPed(player.Handle);
    const pedModel = GetEntityModel(playersPed)
    const playerPos = player.Position;
    const playerHeading = GetEntityHeading(playersPed);

    // pass their information, ped and position to all staff clients.
    const playerLicense = await player.GetIdentifier("license");

    this.leftPlayers.push({
      netId: player.Handle,
      license: playerLicense,
      position: playerPos
    });

    // send it to all staff
    const svPlayers = this.server.connectedPlayerManager.GetPlayers;
    for (let i = 0; i < svPlayers.length; i++) {
      if (svPlayers[i].Spawned) {
        if (svPlayers[i].Rank >= Ranks.Moderator) {
          await svPlayers[i].TriggerEvent(Events.createGhostPlayer, Object.assign({}, player), playerLicense, playerPos, playerHeading, pedModel);
        }
      }
    }

    // After 20 seconds remove their information from S & C, then delete their ped
    setTimeout(async() => {
      const playerIndex = this.leftPlayers.findIndex(leftPlayer => leftPlayer.netId === player.Handle);
      if (playerIndex !== -1) {
        this.leftPlayers.splice(playerIndex, 1);
        
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;
        for (let i = 0; i < svPlayers.length; i++) {
          if (svPlayers[i].Spawned) {
            if (svPlayers[i].Rank >= Ranks.Moderator) {
              await svPlayers[i].TriggerEvent(Events.deleteGhostPlayer, parseInt(player.Handle));
            }
          }
        }
      }
    }, serverConfig.controllers.staff.ghostPlayers.deleteTimer); // Wait 20 seconds
  }
}