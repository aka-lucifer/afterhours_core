import {Server} from "../../server";

import serverConfig from "../../../configs/server.json";
import {addZero, randomBetween} from "../../utils";
import {Events} from "../../../shared/enums/events";
import {Command} from "../../models/ui/chat/command";
import {Ranks} from "../../../shared/enums/ranks";

export class TimeManager {
  private server: Server;

  // Time
  private hour: number;
  private minute: number;
  private time: string;

  // Time Controlling
  private timeFrozen: boolean;
  private timeInterval: NodeJS.Timeout = undefined;

  constructor(server: Server) {
    this.server = server;
    GlobalState.timeFrozen = false;
  }

  // Methods
  public async set(): Promise<void> {
    this.hour = randomBetween(serverConfig.syncing.time.starter.hour.minimum, serverConfig.syncing.time.starter.hour.maxium);
    this.minute = randomBetween(serverConfig.syncing.time.starter.time.minimum, serverConfig.syncing.time.starter.time.maxium);
    this.setFormattedTime();

    setTimeout(() => { // have to do this as we have to wait pass startup (syncs to all connected clients)
      emitNet(Events.syncTime, -1, this.hour, this.minute);
    }, 250);
  }

  public setFormattedTime(): void {
    GlobalState.time = `${addZero(this.hour)}:${addZero(this.minute)}`;
    this.time = GlobalState.time;
  }

  public startTime(): void {
    this.timeInterval = setInterval(() => { // 21,600 seconds (6 hours | 1,440 times) - Is a full day
      const tempTime = GlobalState.time;
      if (!this.timeFrozen) {
        this.minute++;
        if (this.minute > 60) {
          this.hour++;
          if (this.hour >= 24) {
            this.hour = 0;
          }
          this.minute = 0;
        }

        this.setFormattedTime();

        console.log(`Old Time: ${tempTime} | New Time: ${this.time}`, this.hour, this.minute);
        emitNet(Events.syncTime, -1, this.hour, this.minute);
      }
    }, serverConfig.syncing.time.secondInterval);
  }
}
