
import { Playtime } from "../models/playtime";
import * as Database from "../managers/database"
import { Events } from "../../shared/enums/events";
import { Ranks } from "../../shared/enums/ranks";
import * as Utils from "../utils";
import serverConfig from "../../configs/server.json";
import { server } from "../server";
import { LogTypes } from "../enums/logTypes";
import WebhookMessage from "./webhook/webhookMessage";

export class Player {
  public id: number;
  private license: string;
  public handle: string;
  private name: string;
  private rank: number;
  public identifiers: Record<string, string>;
  public ping: number;
  public playtime: number;
  private joinTime: string;
  private whitelisted: boolean = false;

  constructor(handle: string) {
    this.handle = handle;
    this.name = GetPlayerName(this.handle);
    this.rank = Ranks.User;
    this.identifiers = this.GetAllIdentifiers();
    this.ping = GetPlayerPing(this.handle);
  }

  // Get Requests
  public get GetHandle(): string {
    return this.handle
  }

  public get GetName(): string {
    return this.name;
  }
  
  public get GetRank(): number {
    return this.rank;
  }

  public get Identifiers(): Record<string, string> {
    return this.identifiers;
  }

  public get GetPing(): number {
    return this.ping;
  }

  public get GetPlaytime(): Playtime {
    return new Playtime(this.playtime);
  }

  // Set Requests
  public set SetHandle(newHandle: string) {
    this.handle = newHandle;
  }

  // Methods
  public async GetIdentifier(type : string): Promise<string> {
    const identifiers : string[] = [];
    const identifierAmount = GetNumPlayerIdentifiers(this.handle);
    for (let a = 0; a < identifierAmount; a++) {
      identifiers[a] = GetPlayerIdentifier(this.handle, a);
    }

    for (let b = 0; b < identifiers.length; b++) {
      if (identifiers[b].includes(type)) {
        // return identifiers[b];
        return identifiers[b];
      }
    }

    return "Unknown";
  }

  public GetAllIdentifiers(): Record<string, string>{
    const identifiers: Record<string, string> = {};
    const identCount = GetNumPlayerIdentifiers(this.handle);

    for (let a = 0; a < identCount; a++) {
      const value = GetPlayerIdentifier(this.handle, a);
      const index = value.substr(0, value.indexOf(":"));
      identifiers[index] = value
    }
    return identifiers;
  }

  public async Exists(): Promise<boolean> {
    this.license = await this.GetIdentifier("license");
    const results = await Database.SendQuery("SELECT `player_id`, `whitelisted` FROM `players` WHERE `identifier` = :identifier", {
      identifier: this.license
    });

    if (results.data.length > 0) {
      this.id = results.data[0].player_id;
      this.whitelisted = results.data[0].whitelisted > 0 ? true : false;
      return true;
    }

    return false;
  }

  public async Insert(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `players` (`name`, `identifier`, `steam_hex`, `xbl`, `live`, `discord`, `fivem`, `ip`) VALUES (:name, :identifier, :steam_hex, :xbl, :live, :discord, :fivem, :ip)", {
      name: this.name,
      identifier: await this.GetIdentifier("license"),
      steam_hex: await this.GetIdentifier("steam"),
      xbl: await this.GetIdentifier("xbl"),
      live: await this.GetIdentifier("live"),
      discord: await this.GetIdentifier("discord"),
      fivem: await this.GetIdentifier("fivem"),
      ip: await this.GetIdentifier("ip"),
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      return true;
    }
    
    return false;
  }

  public async Update(): Promise<boolean> {
    const updated = await Database.SendQuery("UPDATE `players` SET `name` = :name, `steam_hex` = :steam_hex, `xbl` = :xbl, `live` = :live, `discord` = :discord, `fivem` = :fivem, `ip` = :ip, `last_connection` = :last_connection WHERE `identifier` = :identifier", {
      name: this.name,
      identifier: await this.GetIdentifier("license"),
      steam_hex: await this.GetIdentifier("steam"),
      xbl: await this.GetIdentifier("xbl"),
      live: await this.GetIdentifier("live"),
      discord: await this.GetIdentifier("discord"),
      fivem: await this.GetIdentifier("fivem"),
      ip: await this.GetIdentifier("ip"),
      last_connection: await Utils.GetTimestamp()
    });
    
    if (updated.data.length > 0) {
      return true;
    }
    
    return false;
  }

  public async Load(): Promise<boolean> {
    this.license = await this.GetIdentifier("license");
    const playerData = await Database.SendQuery("SELECT `player_id`, `rank`, `whitelisted`, `playtime`, `last_connection` FROM `players` WHERE `identifier` = :identifier", {
      identifier: this.license
    })

    if (playerData.data.length > 0) {
      
      // Get Player Data
      this.id = playerData.data[0].player_id;
      this.rank = playerData.data[0].rank;
      this.whitelisted = playerData.data[0].whitelisted > 0 ? true : false;
      this.playtime = playerData.data[0].playtime;
      this.joinTime = playerData.data[0].last_connection;
      return true;
    }

    return false;
  }

  public async Whitelisted(): Promise<boolean> {
    return this.whitelisted;
  }

  public async TriggerEvent(eventName: Events, ...args: any[]): Promise<void> {
    return emitNet(eventName, this.handle, ...args);
  }

  public async Disconnect(disconnectReason: string): Promise<boolean> { // Handles updating your disconnection timestamp and your total playtime
    const leaveTime = await Utils.GetTimestamp();
    const updatedDisconnection = await Database.SendQuery("UPDATE `players` SET `playtime` = :newPlaytime, `last_disconnection` = :newDisconnection WHERE `identifier` = :identifier", {
      identifier: this.license,
      newPlaytime: this.playtime = this.playtime + (new Date(leaveTime).getTime() / 1000) - (new Date(this.joinTime).getTime() / 1000),
      newDisconnection: leaveTime
    });

    server.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
      color: 4431943,
      title: "Player Disconnected",
      description: `A player has disconnected from the server.\n\n**Reason**: ${disconnectReason}\n`,
      fields: [
        {
          name: `Player Information:`,
          value: `**Name**: ${this.GetName}\n**Ranks**: ${Ranks[this.rank]}\n**Playtime**: ${await this.GetPlaytime.FormatTime()}\n**Whitelisted**: ${this.whitelisted}\n**Identifiers**: ${JSON.stringify(this.identifiers)}`
        },
      ],
      footer: {text: "Unnamed Project", icon_url: "https://i.imgur.com/BXogrnJ.png"}
    }]}));

    if (updatedDisconnection.meta.affectedRows > 0) {
      if (serverConfig.debug) {
        Utils.Inform("Player Class", `Updated Playtime: ${await this.GetPlaytime.FormatTime()} | Updating Last Disconnection: ${leaveTime}`);
      }
      return true;
    }
  }
}