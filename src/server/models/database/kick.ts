import {Player} from "./player";
import { server } from "../../server";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logTypes";

import {addZero, Error, Inform} from "../../utils";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import {ErrorCodes} from "../../../shared/enums/errors";
import * as sharedConfig from "../../../configs/shared.json"
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";

export class Kick {
  private id: number;
  public systemKick: boolean;

  private playerId: number;
  private player: Player;

  private kickReason: string;
  private kickedBy: number;
  private kicker: Player;
  private issuedOn: Date;

  constructor(playerId: number, reason: string, issuedBy?: number) {
    this.playerId = playerId;
    this.kickReason = reason;

    if (issuedBy < 0 || issuedBy === undefined || issuedBy == this.playerId) {
      this.systemKick = true;
    } else {
      this.kickedBy = issuedBy;
    }

    // Inform("Kick Class", `Defined Kick Class Data: ${JSON.stringify((this))}`);
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

  public get Kicker(): Player {
    return this.kicker;
  }

  public set Kicker(newKicker: Player) {
    this.kicker = newKicker;
  }

  public get Reason(): string {
    return this.kickReason;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_kicks` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.playerId,
      reason: this.kickReason,
      issuedBy: !this.systemKick ? this.kickedBy : this.playerId
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      this.player = await server.connectedPlayerManager.GetPlayerFromId(this.playerId);
      await this.player.getTrustscore(); // Refresh the players trustscore

      if (!this.systemKick) {
        const kickersDiscord = await this.kicker.GetIdentifier("discord");

        await server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Kick Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Kicked__",
            description: `A player has been kicked from the server.\n\n**Kick ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.kickReason}\n**Kicked By**: [${Ranks[this.kicker.Rank]}] - ${this.kicker.GetName}\n**Kickers Discord**: ${kickersDiscord != "Unknown" ? `<@${kickersDiscord}>` : kickersDiscord}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      } else {
        await server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Kick Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Kicked__",
            description: `A player has been kicked from the server.\n\n**Kick ID**: #${this.id}\n**Username**: ${this.player.GetName}\n**Reason**: ${this.kickReason}\n**Kicked By**: System`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }

      server.kickManager.Add(this);
      await this.player.getTrustscore(); // Refresh the players trustscore
      return true
    }

    return false;
  }

  public drop(): void {
    if (!this.systemKick) {
      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been kicked from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.kicker.Rank]}] - ^3${this.kicker.GetName} ^0for ^3${this.kickReason}^0!`, SystemTypes.Admin));
      DropPlayer(this.player.Handle, `\n__[${sharedConfig.serverName}]__: You were kicked from ${sharedConfig.serverName}.\n__By__: [${Ranks[this.kicker.Rank]}] - ${this.kicker.GetName}\n__Reason__: ${this.kickReason}`);
    } else {
      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.player.GetName} ^0has been kicked from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.kickReason}^0!`, SystemTypes.Admin));
      DropPlayer(this.player.Handle, `\n__[${sharedConfig.serverName}]__: You were kicked from ${sharedConfig.serverName}.\n__By__: System\n__Reason__: ${this.kickReason}`);
    }
  }
}
