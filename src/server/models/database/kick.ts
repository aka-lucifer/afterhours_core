import {Player} from "./player";
import { server } from "../../server";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logging";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import * as sharedConfig from "../../../configs/shared.json"
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";

export class Kick {
  private id: number;
  public systemKick: boolean;

  private readonly receiverId: number;
  private receiver: Player;

  private kickReason: string;

  private readonly issuedById: number;
  private issuedBy: Player;

  private logger: LogTypes = LogTypes.Action;
  private url: string;
  private issuedOn: Date;

  constructor(playerId: number, reason: string, issuedBy?: number) {
    this.receiverId = playerId;
    this.kickReason = reason;

    // if (issuedBy < 0 || issuedBy === undefined || issuedBy == this.playerId) {
    //   this.systemKick = true;
    // } else {
    //   this.kickedBy = issuedBy;
    // }
    this.issuedById = issuedBy;

    // Inform("Kick Class", `Defined Kick Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
  }

  public get ReceiverId(): number {
    return this.receiverId;
  }

  public get Reason(): string {
    return this.kickReason;
  }

  public get IssuedById(): number {
    return this.issuedById;
  }

  public set Receiver(newPlayer: Player) {
    this.receiver = newPlayer;
  }

  public set IssuedBy(newPlayer: Player) {
    this.issuedBy = newPlayer;
  }

  public set Logger(newType: LogTypes) {
    this.logger = newType;
  }

  public set URL(newUrl: string) {
    this.url = newUrl;
  }

  public set IssuedOn(dateIssued: Date) {
    this.issuedOn = dateIssued;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_kicks` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.receiverId,
      reason: this.kickReason,
      issuedBy: !this.systemKick ? this.issuedById : this.receiverId
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      await this.receiver.getTrustscore(); // Refresh the players trustscore

      if (this.receiver.Rank > Ranks.User && this.receiver.Rank < Ranks.Moderator) { // If they have a higher rank than user and aren't, staff, reset them back to user.
        await this.receiver.UpdateRank(Ranks.User);
      }

      if (!this.systemKick) {
        const kickersDiscord = await this.receiver.GetIdentifier("discord");

        await server.logManager.Send(this.logger, new WebhookMessage({
          username: "Kick Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Kicked__",
            image: {
              url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
            },
            description: `A player has been kicked from the server.\n\n**Kick ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.kickReason}\n**Kicked By**: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n**Kickers Discord**: ${kickersDiscord != "Unknown" ? `<@${kickersDiscord}>` : kickersDiscord}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      } else {
        await server.logManager.Send(this.logger, new WebhookMessage({
          username: "Kick Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Player Kicked__",
            image: {
              url: this.logger == LogTypes.Anticheat && this.url != undefined ? this.url : undefined
            },
            description: `A player has been kicked from the server.\n\n**Kick ID**: #${this.id}\n**Username**: ${this.receiver.GetName}\n**Reason**: ${this.kickReason}\n**Kicked By**: System`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }

      server.kickManager.Add(this);
      await this.receiver.getTrustscore(); // Refresh the players trustscore
      return true
    }

    return false;
  }

  public drop(): void {
    if (!this.systemKick) {
      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been kicked from ^3${sharedConfig.serverName}^0, by ^3[${Ranks[this.issuedBy.Rank]}] - ^3${this.issuedBy.GetName} ^0for ^3${this.kickReason}^0!`, SystemTypes.Admin));
      DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were kicked from ${sharedConfig.serverName}.\n__By__: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n__Reason__: ${this.kickReason}`);
    } else {
      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has been kicked from ^3${sharedConfig.serverName}^0, by ^3System ^0for ^3${this.kickReason}^0!`, SystemTypes.Admin));
      DropPlayer(this.receiver.Handle, `\n__[${sharedConfig.serverName}]__: You were kicked from ${sharedConfig.serverName}.\n__By__: System\n__Reason__: ${this.kickReason}`);
    }
  }
}