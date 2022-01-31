import { Playtime } from "./playtime";
import * as Utils from "../../utils";

import * as Database from "../../managers/database/database"

import { LogTypes } from "../../enums/logTypes";
import WebhookMessage from "../webhook/webhookMessage";

import serverConfig from "../../../configs/server.json";
import { server } from "../../server";

import { Events } from "../../../shared/enums/events";
import { Ranks } from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import sharedConfig from "../../../configs/shared.json"

export class Player {
  public id: number;
  private license: string;
  private hardwareId: string;
  public handle: string;
  private readonly name: string;
  private rank: number;
  public identifiers: Record<string, string>;
  public ping: number;
  public playtime: number;
  private joinTime: string;
  private whitelisted: boolean = false;

  constructor(handle: string) {
    this.hardwareId = GetPlayerToken(handle, 0) || "Unknown";
    this.handle = handle;
    this.name = GetPlayerName(this.handle);
    this.rank = Ranks.User;
    this.identifiers = this.GetAllIdentifiers();
    this.ping = GetPlayerPing(this.handle);
  }

  // Get Requests
  public get Id(): number {
    return this.id;
  }

  public get HardwareId(): string {
    return this.hardwareId;
  }

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
    // const identifiers : string[] = []; OLD VERSION
    // const identifierAmount = GetNumPlayerIdentifiers(this.handle);
    // for (let a = 0; a < identifierAmount; a++) {
    //   identifiers[a] = GetPlayerIdentifier(this.handle, a);
    // }
    //
    // for (let b = 0; b < identifiers.length; b++) {
    //   if (identifiers[b].includes(type)) {
    //     const identifierIndex = identifiers[b].indexOf(":") + 1; // Add one as we have to get the next index
    //     return identifiers[b].substring((identifierIndex));
    //   }
    // }

    if (this.identifiers[type]) {
      return this.identifiers[type];
    }

    return "Unknown";
  }

  public GetAllIdentifiers(): Record<string, string>{
    const identifiers: Record<string, string> = {};
    const identCount = GetNumPlayerIdentifiers(this.handle);

    for (let a = 0; a < identCount; a++) {
      const value = GetPlayerIdentifier(this.handle, a);
      const index = value.substr(0, value.indexOf(":"));
      const identifierIndex = value.indexOf(":") + 1; // Add one as we have to get the next index
      identifiers[index] = value.substring(identifierIndex);
    }
    return identifiers;
  }

  public async Exists(): Promise<boolean> {
    if (GetConvar('sv_lan', "off") == "false") {
      this.license = await this.GetIdentifier("license");
      const results = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `whitelisted` FROM `players` WHERE `identifier` = :identifier", {
        identifier: this.license
      });

      if (results.data.length > 0) {
        this.id = results.data[0].player_id;
        this.hardwareId = results.data[0].hardware_id;
        console.log("set rank 1", JSON.stringify((results.data[0])));
        this.rank = results.data[0].rank;
        this.whitelisted = results.data[0].whitelisted > 0;
        return true;
      }
    } else {
      const results = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `whitelisted` FROM `players` WHERE `steam_hex` = :steam OR `ip` = :ip", {
        steam: await this.GetIdentifier("steam"),
        ip: await this.GetIdentifier("ip")
      });

      if (results.data.length > 0) {
        this.id = results.data[0].player_id;
        this.hardwareId = results.data[0].hardware_id;
        console.log("set rank 2", JSON.stringify((results.data[0])));
        this.rank = results.data[0].rank;
        this.whitelisted = results.data[0].whitelisted > 0;
        return true;
      }
    }

    return false;
  }

  public async Insert(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `players` (`name`, `identifier`, `hardware_id`, `steam_hex`, `xbl`, `live`, `discord`, `fivem`, `ip`) VALUES (:name, :identifier, :hardwareId, :steam_hex, :xbl, :live, :discord, :fivem, :ip)", {
      name: this.name,
      identifier: await this.GetIdentifier("license"),
      hardwareId: this.hardwareId,
      steam_hex: await this.GetIdentifier("steam"),
      xbl: await this.GetIdentifier("xbl"),
      live: await this.GetIdentifier("live"),
      discord: await this.GetIdentifier("discord"),
      fivem: await this.GetIdentifier("fivem"),
      ip: await this.GetIdentifier("ip"),
    });

    return inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0;
  }

  public async Update(): Promise<boolean> {
    this.hardwareId = GetPlayerToken(this.handle, 0) || "Unknown";
    const updated = await Database.SendQuery("UPDATE `players` SET `name` = :name, `hardware_id` =:hardwareId, `steam_hex` = :steam_hex, `xbl` = :xbl, `live` = :live, `discord` = :discord, `fivem` = :fivem, `ip` = :ip, `last_connection` = :last_connection WHERE `identifier` = :identifier", {
      name: this.name,
      identifier: await this.GetIdentifier("license"),
      hardwareId: this.hardwareId,
      steam_hex: await this.GetIdentifier("steam"),
      xbl: await this.GetIdentifier("xbl"),
      live: await this.GetIdentifier("live"),
      discord: await this.GetIdentifier("discord"),
      fivem: await this.GetIdentifier("fivem"),
      ip: await this.GetIdentifier("ip"),
      last_connection: await Utils.GetTimestamp()
    });
    
    return updated.data.length > 0;
  }

  public async Load(): Promise<boolean> {
    if (GetConvar('sv_lan', "off") == "false") {
      this.license = await this.GetIdentifier("license");
      const playerData = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `whitelisted`, `playtime`, `last_connection` FROM `players` WHERE `identifier` = :identifier", {
        identifier: this.license
      });

      if (playerData.data.length > 0) {

        // Get Player Data
        this.id = playerData.data[0].player_id;
        this.hardwareId = playerData.data[0].hardware_id;
        console.log("set rank 3", JSON.stringify((playerData.data[0])));
        this.rank = playerData.data[0].rank;
        console.log("rank 3", this.rank, Ranks[this.rank]);
        this.whitelisted = playerData.data[0].whitelisted > 0;
        this.playtime = playerData.data[0].playtime;
        this.joinTime = playerData.data[0].last_connection;
        return true;
      }
    } else {
      const playerData = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `whitelisted`, `playtime`, `last_connection` FROM `players` WHERE `steam_hex` = :steam OR `ip` = :ip", {
        steam: await this.GetIdentifier("steam"),
        ip: await this.GetIdentifier("ip")
      });

      if (playerData.data.length > 0) {

        // Get Player Data
        this.id = playerData.data[0].player_id;
        this.hardwareId = playerData.data[0].hardware_id;
        console.log("set rank 4", JSON.stringify((playerData.data[0])));
        this.rank = playerData.data[0].rank;
        this.whitelisted = playerData.data[0].whitelisted > 0;
        this.playtime = playerData.data[0].playtime;
        this.joinTime = playerData.data[0].last_connection;
        return true;
      }
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

    await server.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
      color: EmbedColours.Red,
      title: "__Player Disconnected__",
      description: `A player has disconnected from the server.\n\n**Reason**: ${disconnectReason}\n\n**Name**: ${this.GetName}\n\n**Rank**: ${Ranks[this.rank]}\n\n**Playtime**: ${await this.GetPlaytime.FormatTime()}\n\n**Whitelisted**: ${this.whitelisted}\n\n**Identifiers**: ${JSON.stringify(this.identifiers)}`,
      footer: {text: sharedConfig.serverName, icon_url: sharedConfig.serverLogo}
    }]}));

    if (updatedDisconnection.meta.affectedRows > 0) {
      if (serverConfig.debug) {
        Utils.Inform("Player Class", `Updated Playtime: ${await this.GetPlaytime.FormatTime()} | Updating Last Disconnection: ${leaveTime}`);
      }
      return true;
    }
  }
}
