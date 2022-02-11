import { Player } from "./player";
import * as Database from "../../managers/database/database";

import { Message } from "../../../shared/models/ui/chat/message";

export class ChatLog {
  private player: Player;
  private message: Message;

  constructor(playerData: Player, message: Message) {
    this.player = playerData;
    this.message = message;
  }

  public async save(): Promise<boolean> {
    const storedMessage = await Database.SendQuery("INSERT INTO `chat_logs` (`player_id`, `message`, `type`) VALUES(:player_id, :message, :type)", {
      player_id: this.player.id,
      message: this.message.content,
      type: this.message.type
    });

    return storedMessage.meta.affectedRows > 0 && storedMessage.meta.insertId > 0;
  }
}
