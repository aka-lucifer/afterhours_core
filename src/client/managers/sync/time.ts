import {Client} from "../../client";
import {Delay} from "../../utils";

import {Events} from "../../../shared/enums/events/events";

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

  // Getters
  public get Hour(): number {
    return this.hour;
  }

  public get Minute(): number {
    return this.minute;
  }

  // Methods
  public setupTime(): void {
    this.timeTick = setTick(async() => {
      NetworkOverrideClockTime(this.hour, this.minute, 0);
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
