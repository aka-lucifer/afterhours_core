import {Player} from "./player";
import { server } from "../../server";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logTypes";
import {BanStates} from "../../enums/database/bans";

import {addZero, Error} from "../../utils";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import {ErrorCodes} from "../../../shared/enums/errors";
import * as sharedConfig from "../../../configs/shared.json"
import {Events} from "../../../shared/enums/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";

export class Ban {
  private id: number;
  private playerId: number;
  private hardwareId: string;
  private banReason: string;
  private state: BanStates = BanStates.Active;
  private issuedBy: number | string;
  private issuedOn: Date;
  private issuedUntil: Date;
  private player: Player;
  private banner: Player;
  private logger: LogTypes = LogTypes.Action;
  private url: string;
  private screenshot: boolean;

  constructor(playerId: number, hwid: string, reason: string, issuedBy: number, issuedUntil?: Date) { // Default ban (PERM)
    this.playerId = playerId;
    this.hardwareId = hwid;
    this.banReason = reason;
    this.issuedBy = issuedBy;
    if (issuedUntil == undefined) {
      this.issuedUntil = new Date();
      this.issuedUntil.setFullYear(2099, 12, 31);
    } else {
      this.issuedUntil = issuedUntil;
    }

    // Inform("Ban Class", `Defined Ban Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
  }
  public get PlayerId(): number {
    return this.playerId;
  }

  public get Reason(): string {
    return this.banReason;
  }

  public get State(): BanStates {
    return this.state;
  }

  public set State(newState: BanStates) {
    this.state = newState;
  }

  public get IssuedUntil(): Date {
    return this.issuedUntil;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  public set Banner(newBanner: Player) {
    this.banner = newBanner;
  }

  public set Logger(newType: LogTypes) {
    this.logger = newType;
  }

  public set URL(newUrl: string) {
    this.url = newUrl;
  }

  public set Screenshot(takeScreenshot: boolean) {
    this.screenshot = takeScreenshot;
  }

  // Methods
  public async save(): Promise<boolean> {
    if (this.hardwareId == undefined) this.hardwareId = "3:5789056eef77a45102ba83c183e84a0bfa7e9ea5a122352da1ada9fd366d6d07";
    if (this.issuedBy == undefined) this.issuedBy = this.playerId;

    const bannedUntil = `${this.issuedUntil.getFullYear()}-${addZero(this.issuedUntil.getMonth() + 1)}-${addZero(this.issuedUntil.getDate())} ${addZero(this.issuedUntil.getHours())}:${addZero(this.issuedUntil.getMinutes())}:${addZero(this.issuedUntil.getSeconds())}`;

    const inserted = await Database.SendQuery("INSERT INTO `player_bans` (`player_id`, `hardware_id`, `reason`, `ban_state`, `issued_by`, `issued_until`) VALUES (:playerId, :hardwareId, :banReason, :banState, :issuedBy, :issuedUntil)", {
      playerId: this.playerId,
      hardwareId: this.hardwareId,
      banReason: this.banReason,
      banState: this.state,
      issuedBy: this.issuedBy,
      issuedUntil: bannedUntil
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      const svPlayers = server.playerManager.GetPlayers;
      const playerIndex = svPlayers.findIndex(player => player.HardwareId == this.hardwareId);
      if (playerIndex != -1) {
        this.player = svPlayers[playerIndex];
        this.id = inserted.meta.insertId;

        if (this.issuedUntil.getFullYear() < 2099) { // Non perm ban
          if (this.issuedBy != this.playerId) {
            const bannersDiscord = await this.banner.GetIdentifier("discord");
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}\n**Unban Date**: ${this.issuedUntil.toUTCString()}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been temporarily banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: System\n**Unban Date**: ${this.issuedUntil.toUTCString()}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        } else { // Perm ban
          if (this.issuedBy != this.playerId) {
            const bannersDiscord = await this.banner.GetIdentifier("discord");
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n**Banners Discord**: ${bannersDiscord != "Unknown" ? `<@${bannersDiscord}>` : bannersDiscord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            await server.logManager.Send(this.logger, new WebhookMessage({
              username: "Ban Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Player Banned__",
                image: {
                  url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
                },
                description: `A player has been permanently banned from the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.banReason}\n**Banned By**: System`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }

        server.banManager.Add(this);
        return true;
      } else {
        Error("Ban Class", "There was an issue finding the player from their hardware ID!");
      }
    }

    return false;
  }

  public drop(): void {
    if (this.issuedBy != this.playerId) {
      if (this.issuedUntil.getFullYear() < 2099) {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.banner.GetRank]}] - ^3${this.banner.GetName} ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));
        DropPlayer(this.player.GetHandle, `\n__[${sharedConfig.serverName}]__: You were temporarily banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n__Reason__: ${this.banReason}\n__Expires__: ${this.issuedUntil.toUTCString()}`);
      } else {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.banner.GetRank]}] - ^3${this.banner.GetName} ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));
        DropPlayer(this.player.GetHandle, `\n__[${sharedConfig.serverName}]__: You were permanently banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n__Reason__: ${this.banReason}`);
      }
    } else {
      if (this.issuedUntil.getFullYear() < 2099) {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.banner.GetRank]}] - ^3${this.banner.GetName} ^0for ^3${this.banReason}^0, until ^3${this.issuedUntil.toUTCString()}^0!`, SystemTypes.Admin));
        DropPlayer(this.player.GetHandle, `\n__[${sharedConfig.serverName}]__: You were temporarily banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: System\n__Reason__: ${this.banReason}\n__Expires__: ${this.issuedUntil.toUTCString()}`);
      } else {
        emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been permanently banned from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.banner.GetRank]}] - ^3${this.banner.GetName} ^0for ^3${this.banReason}^0!`, SystemTypes.Admin));
        DropPlayer(this.player.GetHandle, `\n__[${sharedConfig.serverName}]__: You were permanently banned from ${sharedConfig.serverName}.\n__Ban Id__: #${this.id}\n__By__: System\n__Reason__: ${this.banReason}`);
      }
    }
  }

  public async remove(): Promise<boolean> {
    const playerData = await Database.SendQuery("SELECT `name`, `discord` FROM `players` WHERE `player_id` = :playerId", {
      playerId: this.playerId
    });

    if (playerData.data.length > 0) {
      const bannerData = await Database.SendQuery("SELECT `name`, `rank`, `discord` FROM `players` WHERE `player_id` = :playerId", {
        playerId: this.issuedBy
      });

      if (bannerData.data.length > 0) {
        const updatedBan = await Database.SendQuery("UPDATE `player_bans` SET `ban_state` = :newState WHERE `id` = :banId", {
          newState: BanStates.Completed,
          banId: this.id
        });

        if (updatedBan.meta.affectedRows > 0 && updatedBan.meta.changedRows > 0) {
          this.state = BanStates.Completed;
          await server.logManager.Send(this.logger, new WebhookMessage({
            username: "Ban Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Player Automatically Unbanned__",
              description: `A players ban has expired on the server.\n\n**Ban ID**: #${this.id}\n**Username**: ${playerData.data[0].name}\n**Reason**: ${this.banReason}\n**Banned By**: [${Ranks[bannerData.data[0].rank]}] - ${bannerData.data[0].name}\n**Banners Discord**: <@${bannerData.data[0].discord}>`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]
          }));
          return true;
        }
      } else {
        Error("Ban Class", `[${sharedConfig.serverName}]: There was an issue getting your banners player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
      }
    } else {
      Error("Ban Class", `[${sharedConfig.serverName}]: There was an issue getting your player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
    }

    return false;
  }

}
