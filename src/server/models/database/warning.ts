import { server } from "../../server";

import {Player} from "./player";
import {Kick} from "./kick";
import {Ban} from "./ban";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logging";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";

import * as sharedConfig from "../../../configs/shared.json"
import * as serverConfig from "../../../configs/server.json"

export class Warning {
  private id: number;
  public systemWarning: boolean;

  private readonly receiverId: number;
  private receiver: Player;

  private warnReason: string;

  private readonly warnedById: number;
  private warnedBy: Player;

  private issuedOn: Date;

  constructor(playerId: number, reason: string, issuedBy?: number) {
    this.receiverId = playerId;
    this.warnReason = reason;

    if (issuedBy !== undefined) this.warnedById = issuedBy;
    // if (issuedBy < 0 || issuedBy === undefined || issuedBy == this.receiverId) {
    //   this.systemWarning = true;
    // } else {
    //   this.warnedById = issuedBy;
    // }

    // Inform("Warning Class", `Defined Warning Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
  }

  public get Reason(): string {
    return this.warnReason;
  }

  public get ReceiverId(): number {
    return this.receiverId;
  }

  public get WarnedById(): number {
    return this.warnedById;
  }

  public set Receiver(newPlayer: Player) {
    this.receiver = newPlayer;
  }

  public set WarnedBy(newPlayer: Player) {
    this.warnedBy = newPlayer;
  }

  public get IssuedOn(): Date {
    return this.issuedOn;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  public set SystemWarning(newState: boolean) {
    this.systemWarning = newState;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_warnings` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.receiverId,
      reason: this.warnReason,
      issuedBy: !this.systemWarning ? this.warnedById : this.receiverId
    });

    console.log("inserted", inserted)

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;

      if (!this.systemWarning) {
        const warnersDiscord = await this.warnedBy.GetIdentifier("discord");

        await server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Warning Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Warning__",
            description: `A player has received a warning.\n\n**Warning ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.warnReason}\n**Warned By**: [${Ranks[this.warnedBy.Rank]}] - ${this.warnedBy.GetName}\n**Warners Discord**: ${warnersDiscord != "Unknown" ? `<@${warnersDiscord}>` : warnersDiscord}`,
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
            description: `A player has received a warning.\n\n**Warning ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.warnReason}\n**Warned By**: System`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }

      server.warnManager.Add(this);
      await this.receiver.getTrustscore(); // Refresh the players trustscore
      await this.send();

      const warnings = await server.warnManager.getPlayerWarnings(this.receiverId);
      if (warnings.length >= serverConfig.warningActers.kick.start && warnings.length <= serverConfig.warningActers.kick.end) { // If you have 3, 4 or 5 warnings.ts, kick you
        const kick = new Kick(this.receiverId, this.warnReason, this.systemWarning ? this.receiverId : this.warnedById);
        if (!this.systemWarning) kick.IssuedBy = this.warnedBy;
        await kick.save();
        kick.drop();
      }

      if (warnings.length > serverConfig.warningActers.ban) {
        const banDate = new Date();
        banDate.setDate(banDate.getDate() + 3);

        const ban = new Ban(this.receiver.Id, this.receiver.HardwareId, this.warnReason, this.systemWarning ? this.receiverId : this.warnedById, banDate);
        if (!this.systemWarning) ban.IssuedBy = this.warnedBy;
        await ban.save();
        ban.drop();
      }
      return true
    }

    return false;
  }

  public async send(): Promise<void> {
    if (!this.systemWarning) {
      // await this.player.TriggerEvent(Events.sendSystemMessage, new Message(`You've received a warning from ^3[${Ranks[this.warner.Rank]}] - ^3${this.warner.GetName}, ^0for ^3${this.warnReason}`, SystemTypes.Admin));
      await this.receiver.TriggerEvent(Events.receiveWarning, this.warnReason);
      const svPlayers = server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].Handle != this.receiver.Handle) {
          await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`^3${this.receiver.GetName} ^0has received a warning from ^3[${Ranks[this.warnedBy.Rank]}] - ^3${this.warnedBy.GetName}`, SystemTypes.Admin));
        }
      }
    } else {
      // await this.player.TriggerEvent(Events.sendSystemMessage, new Message(`You've received a warning from ^3System, ^0for ^3${this.warnReason}`, SystemTypes.Admin));
      await this.receiver.TriggerEvent(Events.receiveWarning, this.warnReason);
      const svPlayers = server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].Handle != this.receiver.Handle) {
          await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`^3${this.receiver.GetName} ^0has received a warning from ^3System`, SystemTypes.Admin));
        }
      }
    }
  }
}
