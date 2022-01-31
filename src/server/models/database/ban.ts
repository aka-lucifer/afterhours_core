import {Player} from "./player";
import * as Database from "../../managers/database/database";
import {server} from "../../server";
import {LogTypes} from "../../enums/logTypes";
import WebhookMessage from "../webhook/webhookMessage";
import {BanStates} from "../../enums/database/bans";
import {Error} from "../../utils";
import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import { ErrorCodes } from "../../../shared/enums/errors";

export class Ban {
  private id: number;
  private playerId: number;
  private hardwareId: string;
  private banReason: string;
  private state: BanStates = BanStates.Active;
  private issuedBy: number;
  private issuedOn: Date;
  private issuedUntil: Date;
  private player: Player;
  private banner: Player;

  constructor(playerId: number, hwid: string, reason: string, issuedBy: number, issuedUntil: Date = new Date(9999, 11, 24, 10, 33, 30, 0)) { // Default ban (PERM)
    this.playerId = playerId;
    this.hardwareId = hwid;
    this.banReason = reason;
    this.issuedBy = issuedBy;
    this.issuedUntil = issuedUntil;

    // Inform("Ban Class", `Defined Ban Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
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

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_bans` (`player_id`, `hardware_id`, `reason`, `ban_state`, `issued_by`, `issued_until`) VALUES (:playerId, :hardwareId, :banReason, :banState, :issuedBy, :issuedUntil)", {
      playerId: this.playerId,
      hardwareId: this.hardwareId,
      banReason: this.banReason,
      banState: this.state,
      issuedBy: this.issuedBy,
      issuedUntil: this.issuedUntil
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      const svPlayers = server.playerManager.GetPlayers;
      const playerIndex = svPlayers.findIndex(player => player.HardwareId == this.hardwareId);
      if (playerIndex != -1) {
        this.player = svPlayers[playerIndex];
        this.id = inserted.meta.insertId;
        const timestamp = this.issuedUntil.toUTCString();
        const newTimestamp = timestamp.substring(0, timestamp.indexOf(" GMT"));


        const dbDiscord = await this.banner.GetIdentifier("discord");
        const discIndex = dbDiscord.indexOf(":") + 1; // Add one as we have to get the next index
        const discordId = dbDiscord.substring(discIndex);

        if (this.issuedUntil.getFullYear() < 9999) {
          await server.logManager.Send(LogTypes.Action, new WebhookMessage({
            username: "Ban Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Player Banned__",
              description: `A player has been temporarily banned from the server.\n\n**Ban ID**: ${this.id}\n\n**Username**: ${this.player.GetName}\n\n**Reason**: ${this.banReason}\n\n**Banned By**: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n\n**Banners Discord**: <@${discordId}>\n\n**Unban Date**: ${newTimestamp}**.`,
              footer: {text: "Astrid Network", icon_url: "https://i.imgur.com/BXogrnJ.png"}
            }]
          }));
        } else {
          await server.logManager.Send(LogTypes.Action, new WebhookMessage({
            username: "Ban Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Player Banned__",
              description: `A player has been permanently banned from the server.\n\n**Ban ID**: ${this.id}\n\n**Username**: ${this.player.GetName}\n\n**Reason**: ${this.banReason}\n\n**Banned By**: [${Ranks[this.banner.GetRank]}] - ${this.banner.GetName}\n\n**Banners Discord**: <@${discordId}>.`,
              footer: {text: "Astrid Network", icon_url: "https://i.imgur.com/BXogrnJ.png"}
            }]
          }));
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
    if (this.issuedUntil.getFullYear() < 9999) {
      DropPlayer(this.player.GetHandle, `[Astrid Network]: You were banned for ${this.banReason}, until ${this.issuedUntil.toUTCString()}.`);
    } else {
      DropPlayer(this.player.GetHandle, `[Astrid Network]: You were permanently banned for ${this.banReason}.`);
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

        const dbDiscord = bannerData.data[0].discord;
        const discIndex = dbDiscord.indexOf(":") + 1; // Add one as we have to get the next index
        const discordId = dbDiscord.substring(discIndex);

        if (updatedBan.meta.affectedRows > 0 && updatedBan.meta.changedRows > 0) {
          this.state = BanStates.Completed;
          await server.logManager.Send(LogTypes.Action, new WebhookMessage({
            username: "Ban Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Player Automatically Unbanned__",
              description: `A players ban has expired on the server.\n\n**Ban ID**: ${this.id}\n\n**Username**: ${playerData.data[0].name}\n\n**Reason**: ${this.banReason}\n\n**Banned By**: [${Ranks[bannerData.data[0].rank]}] - ${bannerData.data[0].name}\n\n**Banners Discord**: <@${discordId}>`,
              footer: {text: "Astrid Network", icon_url: "https://i.imgur.com/BXogrnJ.png"}
            }]
          }));
          return true;
        }
      } else {
        Error("Ban Class", `[Astrid Network]: There was an issue getting your banners player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
      }
    } else {
      Error("Ban Class", `[Astrid Network]: There was an issue getting your player data.\n\nError Code: ${ErrorCodes.NoDBPlayer}.`)
    }

    return false;
  }

}
