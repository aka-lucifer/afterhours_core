import axios, { AxiosError} from "axios";
import { Vector3 } from "fivem-js";

import { Playtime } from "./playtime";
import {Ban} from "./ban";
import * as Utils from "../../utils";

import * as Database from "../../managers/database/database"

import { LogTypes } from "../../enums/logTypes";
import WebhookMessage from "../webhook/discord/webhookMessage";

import serverConfig from "../../../configs/server.json";
import { server } from "../../server";

import { Events } from "../../../shared/enums/events";
import { Ranks } from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import sharedConfig from "../../../configs/shared.json"
import {Delay, NumToVector3} from "../../utils";
import {Kick} from "./kick";

export class Player {
  public id: number;
  private license: string;
  private hardwareId: string;
  public steamAvatar: string;
  public handle: string;
  private readonly name: string;
  private rank: number;
  public identifiers: Record<string, string>;
  public ping: number;
  public playtime: number;
  public trustscore: number;
  public formattedPlaytime: string;
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
      const results = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `playtime`, `whitelisted` FROM `players` WHERE `identifier` = :identifier", {
        identifier: this.license
      });

      if (results.data.length > 0) {
        this.id = results.data[0].player_id;
        this.hardwareId = results.data[0].hardware_id;
        this.rank = results.data[0].rank;
        this.playtime = results.data[0].playtime;
        this.trustscore = await this.getTrustscore();
        this.whitelisted = results.data[0].whitelisted > 0;
        return true;
      }
    } else {
      const results = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `playtime`, `whitelisted` FROM `players` WHERE `steam_hex` = :steam OR `ip` = :ip", {
        steam: await this.GetIdentifier("steam"),
        ip: await this.GetIdentifier("ip")
      });

      if (results.data.length > 0) {
        this.id = results.data[0].player_id;
        this.hardwareId = results.data[0].hardware_id;
        this.rank = results.data[0].rank;
        this.playtime = results.data[0].playtime;
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
        this.rank = playerData.data[0].rank;
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

  public RefreshPing(): void {
    this.ping = GetPlayerPing(this.handle);
  }

  public async CurrentPlaytime(): Promise<number> {
    const currTime = await Utils.GetTimestamp();
    const currentPlaytime = (new Date(currTime).getTime() / 1000) - (new Date(this.joinTime).getTime() / 1000);
    return this.playtime + currentPlaytime;
  }

  public Position(): Vector3 {
    return NumToVector3(GetEntityCoords(GetPlayerPed(this.GetHandle)));
  }

  public async TriggerEvent(eventName: Events, ...args: any[]): Promise<void> {
    return emitNet(eventName, this.handle, ...args);
  }

  public async GetProfileAvatar(steamHex: string): Promise<string> {
    // console.log("DO IT!");
    const profileId = await Utils.HexadecimalToDec(steamHex)
    const steamAPIKey = GetConvar('steam_webApiKey', "off");
    let avatarUrl = "";
    let doneProcessing = false;

    axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamAPIKey}&steamids=${profileId}`, {}).then(response => {
      // console.log("post repsonse", response.data.response.players[0].avatarfull);
      avatarUrl = response.data.response.players[0].avatarfull;
      doneProcessing = true;
    }).catch(error => {
      console.log("post error", error);
    });

    while (!doneProcessing) {
      await Delay(0);
    }

    return avatarUrl;
  }

  public async getTrustscore(): Promise<number> {
    let currTrustscore = serverConfig.trustscore.default;
    const svBans = server.banManager.GetBans;
    const svKicks = server.kickManager.GetKicks;

    const playtimeAddition = Math.floor(this.playtime / serverConfig.trustscore.playtimeDivider);
    // console.log("add value", this.playtime, playtimeAddition);

    // console.log(`Added (${playtimeAddition}) to your trustscore, due to your playtime | From (${currTrustscore}) -> To (${currTrustscore + playtimeAddition})\n`)
    currTrustscore = currTrustscore + playtimeAddition;
    if (currTrustscore > 100) currTrustscore = 100;

    svBans.forEach((ban: Ban, index) => {
      if (ban.PlayerId == this.id) {
        // console.log(`Ban (Id: ${ban.Id} | Reason: ${ban.Reason}) is yours!\nBan Removal - From (${currTrustscore}) -> To (${currTrustscore - serverConfig.trustscore.banRemoval})\n`);
        currTrustscore = currTrustscore - serverConfig.trustscore.banRemoval;
      }
    });

    svKicks.forEach((kick: Kick, index) => {
      if (kick.PlayerId == this.id) {
        // console.log(`Kick (Id: ${kick.Id} | Reason: ${kick.Reason}) is yours!\nKick Removal - From (${currTrustscore}) -> To (${currTrustscore - serverConfig.trustscore.kickRemoval})\n`);
        currTrustscore = currTrustscore - serverConfig.trustscore.kickRemoval;
      }
    });

    if (currTrustscore > 100) currTrustscore = 100;
    if (currTrustscore < 0) currTrustscore = 0;

    // console.log("Final Trustscore", currTrustscore);

    return currTrustscore;
  }

  public async Disconnect(disconnectReason: string): Promise<boolean> { // Handles updating your disconnection timestamp and your total playtime
    if (disconnectReason.includes("banned")) disconnectReason = "Banned";

    const leaveTime = await Utils.GetTimestamp();
    const updatedDisconnection = await Database.SendQuery("UPDATE `players` SET `playtime` = :newPlaytime, `last_disconnection` = :newDisconnection WHERE `identifier` = :identifier", {
      identifier: this.license,
      newPlaytime: this.playtime = this.playtime + (new Date(leaveTime).getTime() / 1000) - (new Date(this.joinTime).getTime() / 1000),
      newDisconnection: leaveTime
    });

    const discord = await this.GetIdentifier("discord");
    await server.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
      color: EmbedColours.Red,
      title: "__Player Disconnected__",
      description: `A player has disconnected from the server.\n\n**Reason**: ${disconnectReason}\n**Name**: ${this.GetName}\n**Rank**: ${Ranks[this.rank]}\n**Playtime**: ${await this.GetPlaytime.FormatTime()}\n**Whitelisted**: ${this.whitelisted}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(this.identifiers)}`,
      footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
    }]}));

    if (updatedDisconnection.meta.affectedRows > 0) {
      if (serverConfig.debug) {
        Utils.Inform("Player Class", `Updated Playtime: ${await this.GetPlaytime.FormatTime()} | Updating Last Disconnection: ${leaveTime}`);
      }
      return true;
    }
  }
}
