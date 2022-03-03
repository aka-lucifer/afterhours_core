import {Server} from "../../server";

import serverConfig from "../../../configs/server.json";
import {addZero, randomBetween} from "../../utils";

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
  }

  // Methods
  public async set(): Promise<void> {
    this.hour = randomBetween(serverConfig.syncing.time.starter.hour.minimum, serverConfig.syncing.time.starter.hour.maxium);
    this.minute = randomBetween(serverConfig.syncing.time.starter.time.minimum, serverConfig.syncing.time.starter.time.maxium);
    this.setFormattedTime();

    console.log(`Time: ${GlobalState.time}`);
  }

  public setFormattedTime(): void {
    GlobalState.time = `${addZero(this.hour)}:${addZero(this.minute)}`;
    this.time = GlobalState.time;
  }

  public startTime(): void {
    this.timeInterval = setInterval(() => {
      const tempTime = GlobalState.time;
      if (!this.timeFrozen) {
        this.minute = this.minute + 1;
        if (this.minute > 60) {
          this.hour = this.hour + 1;

          if (this.hour >= 24) {
            this.hour = 0;
          }

          this.minute = 0;
        }
        this.setFormattedTime();

        console.log(`Old Time: ${tempTime} | New Time: ${this.time}`, this.hour, this.minute)
      }
    }, serverConfig.syncing.time.secondInterval);
  }
}
