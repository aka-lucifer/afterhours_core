import { server } from "../../server";
import {inDiscord} from "../../utils";

import WebhookMessage from "../webhook/discord/webhookMessage";
import { Player } from "./player";

import * as Database from "../../managers/database/database";

import {LogTypes} from "../../enums/logging";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";

import * as sharedConfig from "../../../configs/shared.json"

export class Commend {
  private id: number;

  private readonly receiverId: number;
  private receiver: Player;
  
  private readonly reason: string;

  private readonly issuedById: number;
  private issuedBy: Player;

  public issuedOn: Date;

  constructor(receiver: number, reason: string, issuedBy: number) {
    this.receiverId = receiver;
    this.reason = reason;
    this.issuedById = issuedBy;
    this.issuedOn = new Date();

    // Inform("Commend Class", `Defined Commend Class Data: ${JSON.stringify((this))}`);
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
    return this.reason;
  }

  public get IssuedById(): number {
    return this.issuedById;
  }

  public get IssuedOn(): Date {
    return this.issuedOn;
  }

  public set IssuedOn(newDate: Date) {
    this.issuedOn = newDate;
  }

  public set Receiver(newPlayer: Player) {
    this.receiver = newPlayer;
  }

  public set IssuedBy(newPlayer: Player) {
    this.issuedBy = newPlayer;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_commends` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.receiverId,
      reason: this.reason,
      issuedBy: this.issuedById
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      await this.receiver.getTrustscore(); // Refresh the players trustscore
      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has received a commend from ^3[${Ranks[this.issuedBy.Rank]}] - ^3${this.issuedBy.GetName}^0, for ^3${this.reason}`, SystemTypes.Admin));
      return true
    }

    return false;
  }

  public async log(): Promise<void> {
    const inDisc = await inDiscord(this.receiver);
    let receiver: string;

    if (inDisc) {
      const commendeesDiscord = await this.receiver.GetIdentifier("discord");
      receiver = `<@${commendeesDiscord}>`;
    } else {
      receiver = `[${Ranks[this.receiver.Rank]}] - ${this.receiver.GetName}`;
    }

    let commendersDiscord = await this.issuedBy.GetIdentifier("discord");
    commendersDiscord = commendersDiscord != "Unknown" ? `<@${commendersDiscord}>` : commendersDiscord

    await server.logManager.Send(LogTypes.Commend, new WebhookMessage({
      username: "Commend Logs", embeds: [{
        color: EmbedColours.Green,
        title: "__Player Commended__",
        description: `A player has received a commendation.\n\n**Commend ID**: #${this.id}\n**Commended**: [${Ranks[this.receiver.Rank]}] - ${this.receiver.GetName}\n**Commendeds Discord**: ${receiver}\n**Reason**: ${this.reason}\n**Commended By**: [${Ranks[this.issuedBy.Rank]}] - ${this.issuedBy.GetName}\n**Commendees Discord**: ${commendersDiscord}`,
        footer: {
          text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
          icon_url: sharedConfig.serverLogo
        }
      }]
    }));
  }
}
