import { server } from "../../server";

import {Player} from "./player";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/logging/embedColours";
import {ErrorCodes} from "../../../shared/enums/logging/errors";
import * as sharedConfig from "../../../configs/shared.json"
import * as serverConfig from "../../../configs/server.json"
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";
import {Inform, inDiscord} from "../../utils";
import {LogTypes} from "../../enums/logTypes";

export class Commend {
  private id: number;
  private readonly receiver: number;
  private readonly reason: string;
  private readonly issuedBy: number;
  public issuedOn: Date;

  constructor(receiver: number, reason: string, issuedBy: number) {
    this.receiver = receiver;
    this.reason = reason;
    this.issuedBy = issuedBy;
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

  public get Receiver(): number {
    return this.receiver;
  }

  public get Reason(): string {
    return this.reason;
  }

  public get IssuedBy(): number {
    return this.issuedBy;
  }

  public get IssuedOn(): Date {
    return this.issuedOn;
  }

  public set IssuedOn(newDate: Date) {
    this.issuedOn = newDate;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_commends` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.receiver,
      reason: this.reason,
      issuedBy: this.issuedBy
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      const myPlayer = await server.connectedPlayerManager.GetPlayerFromId(this.receiver);
      await myPlayer.getTrustscore(); // Refresh the players trustscore

      const issuersPlayer = await server.connectedPlayerManager.GetPlayerFromId(this.issuedBy);

      const inDisc = await inDiscord(myPlayer);
      let receiver: string;

      if (inDisc) {
        const commendeesDiscord = await myPlayer.GetIdentifier("discord");
        receiver = `<@${commendeesDiscord}>`;
      } else {
        receiver = `[${Ranks[myPlayer.Rank]}] - ${myPlayer.GetName}`;
      }

      let commendersDiscord = await issuersPlayer.GetIdentifier("discord");
      commendersDiscord = commendersDiscord != "Unknown" ? `<@${commendersDiscord}>` : commendersDiscord

      await server.logManager.Send(LogTypes.Commend, new WebhookMessage({
        username: "Commend Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Commended__",
          description: `A player has received a commendation.\n\n**Commend ID**: #${this.id}\n**Commended**: ${receiver}\n**Reason**: ${this.reason}\n**Commended By**: [${Ranks[myPlayer.Rank]}] - ${myPlayer.GetName}\n**Commenders Discord**: ${commendersDiscord}`,
          footer: {
            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
            icon_url: sharedConfig.serverLogo
          }
        }]
      }));

      emitNet(Events.sendSystemMessage, -1, new Message(`^3${myPlayer.GetName} ^0has received a commend from ^3[${Ranks[myPlayer.Rank]}] - ^3${myPlayer.GetName}^0, for ^3${this.reason}`, SystemTypes.Admin));
      return true
    }

    return false;
  }
}
