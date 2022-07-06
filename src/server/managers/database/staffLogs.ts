import * as Database from "./database";

import { Server } from "../../server"
import { Log } from "../../utils"

import { StaffLog } from "../../models/database/staffLog";

export class StaffLogManager {
  public server: Server;
  private logs: StaffLog[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Requests
  public get GetLogs(): StaffLog[] {
    return this.logs;
  }

  // Methods
  public async loadLogs(): Promise<void> {
    const banData = await Database.SendQuery("SELECT * FROM `staff_logs`", {});
    for (let i = 0; i < Object.keys(banData.data).length; i++) {
      if (banData.data[i].other_id != null) {
        const staffLog = new StaffLog(banData.data[i].player_id, banData.data[i].type, banData.data[i].message, banData.data[i].other_id);
        staffLog.Date = new Date(banData.data[i].date);
        this.logs.push(staffLog);
      } else {
        const staffLog = new StaffLog(banData.data[i].player_id, banData.data[i].type, banData.data[i].message);
        staffLog.Date = new Date(banData.data[i].date);
        this.logs.push(staffLog);
      }
    }
  }

  public Add(logData: StaffLog): number {
    const addedData = this.logs.push(logData);
    if (this.server.IsDebugging) Log("Staff Logs Manager (Add)", JSON.stringify((logData)));
    return addedData;
  }

  public async GetLog(logId: number): Promise<StaffLog> {
    const logIndex = this.logs.findIndex(log => log.Id == logId);
    if (logIndex != -1) {
      return this.logs[logIndex];
    }
  }
}
