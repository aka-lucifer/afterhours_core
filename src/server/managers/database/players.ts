import { Ranks } from "../../../shared/enums/ranks";
import { formatSQLDate } from "../../../shared/utils";
import {DBPlayer} from "../../models/database/dbPlayer";
import {Playtime} from "../../models/database/playtime";
import {Server} from "../../server";

import * as Database from "./database";

export class PlayerManager {
  private server: Server;
  private players: DBPlayer[] = [];
  private bestPlayer: DBPlayer;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public async init(): Promise<void> {
    const players = await Database.SendQuery("SELECT * FROM `players`", {});

    for (let i = 0; i < players.data.length; i++) {
      const player = new DBPlayer(players.data[i]);
      if (this.bestPlayer === undefined) {
        this.bestPlayer = player;
      } else {
        if (player.playtime > this.bestPlayer.playtime) {
          this.bestPlayer = player;
        }
      }
      this.players.push(player)
    }
  }

  public Add(playerId: number, license: string, hardwareId: string, name: string, rank: Ranks, playtime: number, whitelisted: number, discord: string): void {
    const player = new DBPlayer({
      player_id: playerId,
      identifier: license,
      hardware_id: hardwareId,
      name: name,
      rank: rank,
      playtime: playtime,
      whitelisted: whitelisted,
      discord: discord,
      initial_connection: formatSQLDate(new Date())
    });
    
    this.players.push(player);
  }

  public async getPlayerFromId(playerId: number): Promise<DBPlayer> {
    const playerIndex = this.players.findIndex(player => player.Id == playerId);
    if (playerIndex != -1) {
      return this.players[playerIndex];
    }
  }

  public async getPlayerFromLicense(license: string): Promise<DBPlayer> {
    const playerIndex = this.players.findIndex(player => player.License == license);
    if (playerIndex != -1) {
      return this.players[playerIndex];
    }
  }

  public async getBestPlayer(): Promise<string> {
    const result = await Database.SendQuery("SELECT * FROM `players` ORDER BY `playtime` DESC LIMIT 1", {});
    if (result.data[0].playtime > this.bestPlayer.playtime) {
      this.bestPlayer = new DBPlayer(result.data[0]);
    }
    return `${this.bestPlayer.GetName} - ${await new Playtime(this.bestPlayer.playtime).FormatTime()}`;
  }
}
