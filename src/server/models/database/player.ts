import axios from "axios";
import { Vector3 } from "fivem-js";

import { Playtime } from "./playtime";
import {Ban} from "./ban";
import { Job } from "../jobs/job";
import * as Utils from "../../utils";

import * as Database from "../../managers/database/database"

import { LogTypes } from "../../enums/logging";
import WebhookMessage from "../webhook/discord/webhookMessage";

import serverConfig from "../../../configs/server.json";
import { server } from "../../server";

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import sharedConfig from "../../../configs/shared.json"
import {Delay, NumToVector3} from "../../utils";
import {Kick} from "./kick";
import {Warning} from "./warning";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import {Notification} from "../ui/notification";
import { Character, Metadata } from "./character";
import { getRankFromValue } from "../../../shared/utils";
import { JobEvents } from "../../../shared/enums/events/jobs/jobEvents";

export class Player {
  public id: number;
  private license: string;
  private hardwareId: string;
  public steamAvatar: string;
  public handle: string;
  private readonly name: string;
  private rank: Ranks = Ranks.User;
  public identifiers: Record<string, string>;
  public ping: number;
  public playtime: number;
  public trustscore: number;
  public formattedPlaytime: string;
  private joinTime: string;
  private whitelisted: boolean = false;
  public characters: any[] = [];
  public selectedCharacter: SelectedCharacter;
  private connected: boolean;
  private spawned: boolean;

  constructor(handle: string) {
    this.hardwareId = GetPlayerToken(handle, 0) || "Unknown";
    this.handle = handle;
    this.name = GetPlayerName(this.handle);
    this.rank = Ranks.User;
    this.identifiers = this.GetAllIdentifiers();
    this.ping = GetPlayerPing(this.handle);
  }

  // Getters & Setters
  public get Id(): number {
    return this.id;
  }

  public get HardwareId(): string {
    return this.hardwareId;
  }

  public get Handle(): string {
    return this.handle
  }

  public set Handle(newHandle: string) {
    this.handle = newHandle;
  }

  public get GetName(): string {
    return this.name;
  }
  
  public get Rank(): number {
    return this.rank;
  }

  public set Rank(newRank: number) {
    this.rank = newRank;
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

  public get Trustscore(): number {
    return this.trustscore;
  }

  public get Connected(): boolean {
    return this.connected;
  }

  public set Connected(newValue: boolean) {
    this.connected = newValue;
  }

  public get Spawned(): boolean {
    return this.spawned;
  }

  public set Spawned(newValue: boolean) {
    this.spawned = newValue;
  }

  public get Position(): Vector3 {
    return NumToVector3(GetEntityCoords(GetPlayerPed(this.Handle)));
  }

  // Methods
  public async GetIdentifier(type : string): Promise<string> {
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
      const index = value.substr(0, value.indexOf(":")); // Prefix (steam/license/ip)

      if (index == "ip") { // If the current identifier is IP
        if (this.Rank >= Ranks.SeniorAdmin) { // If you're a Sr Admin or above, hide your IP
          identifiers[index] = "Protected"
        } else {
          const identifierIndex = value.indexOf(":") + 1; // Add one as we have to get the next index
          identifiers[index] = value.substring(identifierIndex);
        }
      } else {
        const identifierIndex = value.indexOf(":") + 1; // Add one as we have to get the next index
        identifiers[index] = value.substring(identifierIndex);
      }
    }
    
    return identifiers;
  }

  public async Exists(): Promise<boolean> {
    if (GetConvar('sv_lan', "off") == "false") {
      this.license = await this.GetIdentifier("license");
      const results = await Database.SendQuery("SELECT `player_id`, `hardware_id`, `rank`, `playtime`, `whitelisted` FROM `players` WHERE `identifier` = :identifier", {
        identifier: this.license
      });

      console.log("exists data", results);

      if (results.data.length > 0) {
        this.id = results.data[0].player_id;
        this.hardwareId = results.data[0].hardware_id;
        this.rank = results.data[0].rank;

        // Refresh the identifiers, once we have obtained your rank
        this.identifiers = this.GetAllIdentifiers();

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

        // Refresh the identifiers, once we have obtained your rank
        this.identifiers = this.GetAllIdentifiers();

        this.playtime = results.data[0].playtime;
        this.whitelisted = results.data[0].whitelisted > 0;
        return true;
      }

      // Refresh the identifiers, once we have obtained your rank
      this.identifiers = this.GetAllIdentifiers();
    }

    return false;
  }

  public async Insert(): Promise<boolean> {
    console.log("info", this.name, await this.GetIdentifier)
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

    console.log("insert data", inserted);

    return inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0;
  }

  public async Update(): Promise<boolean> {
    this.hardwareId = GetPlayerToken(this.handle, 0) || "Unknown";
    // this.joinTime = await Utils.GetTimestamp();

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
      last_connection: this.joinTime
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

        // Refresh the identifiers, once we have obtained your rank
        this.identifiers = this.GetAllIdentifiers();

        this.whitelisted = playerData.data[0].whitelisted > 0;
        this.playtime = playerData.data[0].playtime;
        this.trustscore = await this.getTrustscore();
        this.joinTime = await Utils.GetTimestamp();

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
        console.log("FIRST JOIN TIME", playerData.data[0]);
        this.joinTime = await Utils.GetTimestamp();

        return true;
      }
    }

    return false;
  }

  public async Whitelisted(): Promise<boolean> {
    return this.whitelisted;
  }

  public async UpdateRank(newRank: number): Promise<boolean> {
    this.rank = newRank;

    const updated = await Database.SendQuery("UPDATE `players` SET `rank` = :newRank WHERE `player_id` = :id", {
      newRank: newRank,
      id: this.id
    });
    
    return updated.meta.affectedRows > 0;
  }

  public RefreshPing(): number {
    this.ping = GetPlayerPing(this.handle);
    return this.ping;
  }

  public async CurrentPlaytime(): Promise<number> {
    const currTime = await Utils.GetTimestamp();
    const currentPlaytime = (new Date(currTime).getTime() / 1000) - (new Date(this.joinTime).getTime() / 1000);
    return this.playtime + currentPlaytime;
  }

  public async TriggerEvent(eventName: Events | JobEvents, ...args: any[]): Promise<void> {
    return emitNet(eventName, this.handle, ...args);
  }

  public async GetProfileAvatar(steamHex: string): Promise<string> {
    // console.log("DO IT!");
    const profileId = await Utils.HexadecimalToDec(steamHex)
    const steamAPIKey = GetConvar('steam_webApiKey', "off");
    let avatarUrl = "";
    let doneProcessing = false;

    axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamAPIKey}&steamids=${profileId}`, {}).then(response => {
      const profileData = response.data.response.players[0];
      if (profileData !== undefined) {
        avatarUrl = profileData.avatarfull;
      } else {
        avatarUrl = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"; // Placeholder loading screen avatar
      }
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
    const svWarnings = server.warnManager.GetWarnings;
    const myCommends = await Database.SendQuery("SELECT * FROM `player_commends` WHERE `player_id` = :playerId", {
      playerId: this.Id
    });

    const playtimeAddition = Math.floor(this.playtime / serverConfig.trustscore.playtimeDivider);

    // console.log(`Added (${playtimeAddition}) to your trustscore, due to your playtime | From (${currTrustscore}) -> To (${currTrustscore + playtimeAddition})\n`)
    currTrustscore = currTrustscore + playtimeAddition;
    if (currTrustscore > 100) currTrustscore = 100;

    svBans.forEach((ban: Ban) => {
      if (ban.PlayerId == this.id) {
        // console.log(`Ban (Id: ${ban.Id} | Reason: ${ban.Reason}) is yours!\nBan Removal - From (${currTrustscore}) -> To (${currTrustscore - serverConfig.trustscore.banRemoval})\n`);
        currTrustscore = currTrustscore - serverConfig.trustscore.banRemoval;
      }
    });

    svKicks.forEach((kick: Kick) => {
      if (kick.PlayerId == this.id) {
        // console.log(`Kick (Id: ${kick.Id} | Reason: ${kick.Reason}) is yours!\nKick Removal - From (${currTrustscore}) -> To (${currTrustscore - serverConfig.trustscore.kickRemoval})\n`);
        currTrustscore = currTrustscore - serverConfig.trustscore.kickRemoval;
      }
    });

    svWarnings.forEach((warn: Warning) => {
      if (warn.PlayerId == this.id) {
        // console.log(`Warning (Id: ${warn.Id} | Reason: ${warn.Reason}) is yours!\nWarning Removal - From (${currTrustscore}) -> To (${currTrustscore - serverConfig.trustscore.warningRemoval})\n`);
        currTrustscore = currTrustscore - serverConfig.trustscore.warningRemoval;
      }
    });

    for (let i = 0; i < myCommends.data.length; i++) {
      // console.log(`Commend (Id: ${myCommends.data[i].id} | Reason: ${myCommends.data[i].reason})\nCommend Addition - From (${currTrustscore}) -> To (${currTrustscore + serverConfig.trustscore.commendAddition})\n`);
      currTrustscore = currTrustscore + serverConfig.trustscore.commendAddition;
    }

    if (currTrustscore > 100) currTrustscore = 100;
    if (currTrustscore < 0) currTrustscore = 0;

    // console.log("Final Trustscore", currTrustscore);

    return currTrustscore;
  }

  public async isBanned(): Promise<[boolean, Ban]> {
    const [banned, banData] = await server.banManager.playerBanned(this);

    if (banned) {
      return [banned, banData];
    }

    return [false, null];
  }

  public async Notify(title: string, description: string, type: NotificationTypes, timer?: number, progressBar?: boolean): Promise<void> {
    const notification = new Notification(this, title, description, type, timer, progressBar);
    await notification.send();
  }

  public async getCharacters(): Promise<boolean> {
    const characters = [];

    const charData = await Database.SendQuery("SELECT * FROM `player_characters` WHERE `player_id` = :playerId", {
      playerId: this.id
    });

    if (charData.data.length > 0) {
      for (let i = 0; i < charData.data.length; i++) {
        const character = new Character(this.id);
        const jobData = JSON.parse(charData.data[i].job);
        const metaData = JSON.parse(charData.data[i].metadata);

        const job = new Job(jobData.name, jobData.label, jobData.rank, jobData.isBoss, jobData.callsign, jobData.status);
        const metadata = new Metadata(metaData.licenses, metaData.mugshot, metaData.fingerprint, metaData.bloodtype, metaData.isDead, metaData.isCuffed, metaData.jailData, metaData.criminalRecord);

        if (jobData.name != "civilian") { // Only police & fire (formats their rank from number to string)
          job.rankLabel = await getRankFromValue(jobData.rank, jobData.name);
        }

        const formatted = await character.format({
          id: charData.data[i].id,
          firstName: charData.data[i].first_name,
          lastName: charData.data[i].last_name,
          nationality: charData.data[i].nationality,
          backstory: charData.data[i].backstory,
          dob: charData.data[i].dob,
          isFemale: (charData.data[i].gender == 1),
          phone: charData.data[i].phone,
          job: job,
          metadata: metadata,
          createdAt: new Date(charData.data[i].created_at),
          lastUpdated: new Date(charData.data[i].last_updated),
        });

        if (formatted) {
          characters.push(character);
          this.characters = characters;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  public async Disconnect(disconnectReason: string): Promise<boolean> { // Handles updating your disconnection timestamp and your total playtime
    if (disconnectReason.includes("banned")) disconnectReason = "Banned";

    const leaveTime = await Utils.GetTimestamp();
    const updatedDisconnection = await Database.SendQuery("UPDATE `players` SET `playtime` = :newPlaytime, `last_disconnection` = :newDisconnection WHERE `identifier` = :identifier", {
      identifier: this.license,
      newPlaytime: this.playtime = this.playtime + (new Date(leaveTime).getTime() / 1000) - (new Date(this.joinTime).getTime() / 1000),
      newDisconnection: leaveTime
    });

    if (updatedDisconnection.meta.affectedRows > 0) {
    
      if (serverConfig.debug) {
        Utils.Inform("Player Class", `Updated Playtime: ${await this.GetPlaytime.FormatTime()} | Updating Last Disconnection: ${leaveTime}`);
      }

      const discord = await this.GetIdentifier("discord");
      await server.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
        color: EmbedColours.Red,
        title: "__Player Disconnected__",
        description: `A player has disconnected from the server.\n\n**Reason**: ${disconnectReason}\n**Name**: ${this.GetName}\n**Rank**: ${Ranks[this.rank]}\n**Playtime**: ${await this.GetPlaytime.FormatTime()}\n**Whitelisted**: ${this.whitelisted}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(this.Identifiers, null, 4)}`,
        footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
      }]}));
      return true;
    }
  }
}

interface SelectedCharacter {
  id: number,
  firstName: string,
  lastName: string,
  nationality: string,
  backstory: string,
  dob: string,
  age: number,
  isFemale: boolean,
  phone: string,
  job: Job,
  metadata: Metadata,
  createdAt: string,
  lastUpdated: string,
}
