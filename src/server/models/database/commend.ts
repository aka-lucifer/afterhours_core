import { server } from "../../server";

import {Player} from "./player";

import WebhookMessage from "../webhook/discord/webhookMessage";
import * as Database from "../../managers/database/database";

import {Ranks} from "../../../shared/enums/ranks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import {ErrorCodes} from "../../../shared/enums/errors";
import * as sharedConfig from "../../../configs/shared.json"
import * as serverConfig from "../../../configs/server.json"
import {Events} from "../../../shared/enums/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";
import {Inform, inDiscord} from "../../utils";
import {LogTypes} from "../../enums/logTypes";

export class Commend {
  private id: number;
  private readonly receiver: Player;
  private readonly reason: string;
  private readonly issuedBy: Player;

  constructor(receiver: Player, reason: string, issuedBy: Player) {
    this.receiver = receiver;
    this.reason = reason;
    this.issuedBy = issuedBy;

    // Inform("Commend Class", `Defined Commend Class Data: ${JSON.stringify((this))}`);
  }

  // Getters & Setters Requests
  public get Id(): number {
    return this.id;
  }

  public get Receiver(): Player {
    return this.receiver;
  }

  public get IssuedBy(): Player {
    return this.issuedBy;
  }

  public get Reason(): string {
    return this.reason;
  }

  // Methods
  public async save(): Promise<boolean> {
    const inserted = await Database.SendQuery("INSERT INTO `player_commends` (`player_id`, `reason`, `issued_by`) VALUES (:id, :reason, :issuedBy)", {
      id: this.receiver.Id,
      reason: this.reason,
      issuedBy: this.issuedBy.Id
    });

    if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
      this.id = inserted.meta.insertId;
      const inDisc = await inDiscord(this.receiver);
      let receiver: string;

      if (inDisc) {
        const commendeesDiscord = await this.receiver.GetIdentifier("discord");
        receiver = `<@${commendeesDiscord}>`;
      } else {
        receiver = `[${Ranks[this.receiver.GetRank]}] - ${this.receiver.GetName}`;
      }

      let commendersDiscord = await this.issuedBy.GetIdentifier("discord");
      commendersDiscord = commendersDiscord != "Unknown" ? `<@${commendersDiscord}>` : commendersDiscord

      await server.logManager.Send(LogTypes.Commend, new WebhookMessage({
        username: "Commend Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Commended__",
          description: `A player has received a commendation.\n\n**Commend ID**: #${this.id}\n**Commended**: ${receiver}\n**Reason**: ${this.reason}\n**Commended By**: [${Ranks[this.issuedBy.GetRank]}] - ${this.issuedBy.GetName}\n**Commenders Discord**: ${commendersDiscord}`,
          footer: {
            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
            icon_url: sharedConfig.serverLogo
          }
        }]
      }));

      emitNet(Events.sendSystemMessage, -1, new Message(`^3${this.receiver.GetName} ^0has received a commend from ^3[${Ranks[this.issuedBy.GetRank]}] - ^3${this.issuedBy.GetName}^0, for ^3${this.reason}`, SystemTypes.Admin));
      return true
    }

    return false;
  }
}
