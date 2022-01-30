import { Player } from "../player";
import * as Database from "../../managers/database";

export class ChatLog {
  private player: Player;
  private message: string;

  constructor(playerData: Player, message: string) {
    this.player = playerData;
    this.message = message;
  }

  public async Store(): Promise<boolean> {
    const storedMessage = await Database.SendQuery("INSERT INTO `chat_logs` (`player_id`, `message`) VALUES(:player_id, :message)", {
      player_id: this.player.id,
      message: this.message,
    });

    if (storedMessage.meta.affectedRows > 0 && storedMessage.meta.insertId > 0) {
      return true;
    }

    return false;
  }
}