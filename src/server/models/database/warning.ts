import { server } from "../../server";

import {Player} from "./player";
import {Kick} from "./kick";
import {Ban} from "./ban";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logTypes";

import {addZero, Error, Inform} from "../../utils";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import {ErrorCodes} from "../../../shared/enums/errors";
import * as sharedConfig from "../../../configs/shared.json"
import * as serverConfig from "../../../configs/server.json"
import {Events} from "../../../shared/enums/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";

export class Warning {
  private id: number;
  public systemWarning: boolean;

  private playerId: number;
  private player: Player;

  private warnReason: string;
  private warnedBy: number;
  private warner: Player;
  private issuedOn: Date;

  constructor(playerId: number, reason: string, issuedBy?: number) {
    this.playerId = playerId;
    this.warnReason = reason;

    if (issuedBy < 0 || issuedBy === undefined || issuedBy == this.playerId) {
      this.systemWarning = true;
    } else {
      this.warnedBy = issuedBy;
    }

    // Inform("Warning Class", `Defined Warning Class Data: ${JSON.stringify((this))}`);
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

  public get Warner(): Player {
    return this.warner;
  }

  public set Warner(newWarner: Player) {
    this.warner = newWarner;
  }

  public get Reason(): string {
    return this.warnReason;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_warnings` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.playerId,
      reason: this.warnReason,
      issuedBy: !this.systemWarning ? this.warnedBy : this.playerId
    });

    console.log("inserted", inserted)

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      this.player = await server.playerManager.GetPlayerFromId(this.playerId);

      if (!this.systemWarning) {
        const warnersDiscord = await this.warner.GetIdentifier("discord");

        await server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Warning Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Warning__",
            description: `A player has received a warning.\n\n**Warning ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.warnReason}\n**Warned By**: [${Ranks[this.warner.GetRank]}] - ${this.warner.GetName}\n**Warners Discord**: ${warnersDiscord != "Unknown" ? `<@${warnersDiscord}>` : warnersDiscord}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      } else {
        await server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Warning Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Warning__",
            description: `A player has received a warning.\n\n**Warning ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.warnReason}\n**Warned By**: System`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }

      server.warnManager.Add(this);
      await this.send();

      const warnings = await server.warnManager.getPlayerWarnings(this.playerId);
      if (warnings.length >= serverConfig.warningActers.kick.start && warnings.length <= serverConfig.warningActers.kick.end) { // If you have 3, 4 or 5 warnings, kick you
        const kick = new Kick(this.playerId, this.warnReason, this.systemWarning ? this.playerId : this.warnedBy);
        if (!this.systemWarning) kick.Kicker = this.warner;
        await kick.save();
        kick.drop();
      }

      if (warnings.length > serverConfig.warningActers.ban) {
        const banDate = new Date();
        banDate.setDate(banDate.getDate() + 3);

        const ban = new Ban(this.player.Id, this.player.HardwareId, this.warnReason, this.systemWarning ? this.playerId : this.warnedBy, banDate);
        if (!this.systemWarning) ban.Banner = this.warner;
        await ban.save();
        ban.drop();
      }
      return true
    }

    return false;
  }

  public async send(): Promise<void> {
    if (!this.systemWarning) {
      await this.player.TriggerEvent(Events.sendSystemMessage, new Message(`You've received a warning from ^3[${Ranks[this.warner.GetRank]}] - ^3${this.warner.GetName}, ^0for ^3${this.warnReason}`, SystemTypes.Admin))
      const svPlayers = server.playerManager.GetPlayers;

      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].GetHandle != this.player.GetHandle) {
          await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`^3${this.player.GetName} ^0has received a warning from ^3[${Ranks[this.warner.GetRank]}] - ^3${this.warner.GetName}`, SystemTypes.Admin));
        }
      }
    } else {
      await this.player.TriggerEvent(Events.sendSystemMessage, new Message(`You've received a warning from ^3System, ^0for ^3${this.warnReason}`, SystemTypes.Admin))
      const svPlayers = server.playerManager.GetPlayers;

      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].GetHandle != this.player.GetHandle) {
          await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`^3${this.player.GetName} ^0has received a warning from ^3System`, SystemTypes.Admin));
        }
      }
    }
  }
}
