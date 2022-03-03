import {Client} from "../../client";

import {Events} from "../../../shared/enums/events";
import serverConfig from "../../../configs/server.json";
import {Delay} from "../../utils";

export class TimeManager {
  private client: Client;
  private hour: number;
  private minute: number;
  private timeTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.syncTime, this.EVENT_syncTime.bind(this));
  }

  // Methods
  public setupTime(): void {
    this.timeTick = setTick(async() => {
      if (!GlobalState.timeFrozen) {
        NetworkOverrideClockTime(this.hour, this.minute, 0);
      }

      await Delay(1000);
    });
  }

  // Events
  public EVENT_syncTime(hour: number, minute: number) {
    if (!GlobalState.timeFrozen) {
      this.hour = hour;
      this.minute = minute;
      NetworkOverrideClockTime(this.hour, this.minute, 0);

      if (this.timeTick === undefined) {
        this.setupTime();
      }
    }
  }
}
