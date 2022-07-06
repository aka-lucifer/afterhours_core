import { StaffLogs } from "../../enums/database/staffLogs";
import * as Database from "../../managers/database/database";

export class StaffLog {
  private id: number;
  private player: number;
  private readonly type: StaffLogs;
  private readonly message: string;
  private readonly otherPlayer: number;
  private date: Date;

  constructor(playerId: number, type: StaffLogs, message: string, otherPlayerId?: number) {
    this.player = playerId;
    this.type = type;
    this.message = message;
    this.otherPlayer = otherPlayerId;
  }

  // Set Requests
  public set Id(newId: number) {
    this.id = newId;
  }

  public set Date(newTime: Date) {
    this.date = newTime;
  }

  public async save(): Promise<boolean> {
    if (this.otherPlayer) {
      const storedMessage = await Database.SendQuery("INSERT INTO `staff_logs` (`player_id`, `type`, `message`, `other_id`) VALUES(:player_id, :type, :message, :otherId)", {
        player_id: this.player,
        type: this.type,
        message: this.message,
        otherId: this.otherPlayer
      });

      return storedMessage.meta.affectedRows > 0 && storedMessage.meta.insertId > 0;
    } else {
      const storedMessage = await Database.SendQuery("INSERT INTO `staff_logs` (`player_id`, `type`, `message`) VALUES(:player_id, :type, :message)", {
        player_id: this.player,
        type: this.type,
        message: this.message
      });

      return storedMessage.meta.affectedRows > 0 && storedMessage.meta.insertId > 0;
    }
  }
}
