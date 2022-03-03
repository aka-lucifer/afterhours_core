import {Server} from "../../server";

import serverConfig from "../../../configs/server.json";
import {addZero, randomBetween} from "../../utils";
import {Events} from "../../../shared/enums/events";
import {Command} from "../../models/ui/chat/command";
import {Ranks} from "../../../shared/enums/ranks";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";

export class TimeManager {
  private server: Server;

  // Time
  private hour: number;
  private minute: number;
  private time: string;

  // Time Controlling
  private timeFrozen: boolean;
  private timeChanging: boolean;
  private timeInterval: NodeJS.Timeout = undefined;

  constructor(server: Server) {
    this.server = server;
    GlobalState.timeFrozen = false;
    GlobalState.timeChanging = false;
  }

  // Methods
  public setFrozen(newState: boolean): void {
    this.timeFrozen = newState;
    GlobalState.timeFrozen = newState;
  }

  public setChanging(newState: boolean): void {
    this.timeChanging = newState;
    GlobalState.timeChanging = newState;
  }

  public async set(): Promise<void> {
    this.hour = randomBetween(serverConfig.syncing.time.starter.hour.minimum, serverConfig.syncing.time.starter.hour.maxium);
    this.minute = randomBetween(serverConfig.syncing.time.starter.time.minimum, serverConfig.syncing.time.starter.time.maxium);
    this.setFormattedTime();

    setTimeout(() => { // have to do this as we have to wait pass startup (syncs to all connected clients)
      emitNet(Events.syncTime, -1, this.hour, this.minute);
    }, 250);

    new Command("night", "Set the time to night", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        this.setChanging(true);

        emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to night in 15 seconds.`, SystemTypes.Success));
        setTimeout(() => {
          this.hour = serverConfig.syncing.time.commands.night.hour;
          this.minute = serverConfig.syncing.time.commands.night.minute;
          this.setFormattedTime();
          emitNet(Events.syncTime, -1, this.hour, this.minute);
        }, serverConfig.syncing.time.secondInterval);
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("day", "Set the time to day", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        this.setChanging(true);

        emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to day in 15 seconds.`, SystemTypes.Success));
        setTimeout(() => {
          this.hour = serverConfig.syncing.time.commands.day.hour;
          this.minute = serverConfig.syncing.time.commands.day.minute;
          this.setFormattedTime();
          emitNet(Events.syncTime, -1, this.hour, this.minute);
        }, serverConfig.syncing.time.secondInterval);
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("morning", "Set the time to morning", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        this.setChanging(true);

        emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to morning in 15 seconds.`, SystemTypes.Success));
        setTimeout(() => {
          this.hour = serverConfig.syncing.time.commands.morning.hour;
          this.minute = serverConfig.syncing.time.commands.morning.minute;
          this.setFormattedTime();
          emitNet(Events.syncTime, -1, this.hour, this.minute);
        }, serverConfig.syncing.time.secondInterval);
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("time", "Set the time to morning", [{name: "hour", help: "The hour to set the time to."}, {name: "minute", help: "The minute to set the time to."}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {

        if (!isNaN(args[0])) {
          if (!isNaN(args[1])) {
            this.hour = parseInt(args[0]);
            this.minute = parseInt(args[1]);
            this.setFormattedTime();
            emitNet(Events.syncTime, -1, this.hour, this.minute);
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("Minute argument entered isn't a number!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("Hour argument entered isn't a number!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("freezetime", "Set the time to morning", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      this.setFrozen(!this.timeFrozen);
      emitNet(Events.freezeTime, -1);
      if (this.timeFrozen) {
        await player.Notify("Sync Manager", "You've frozen time!", NotificationTypes.Success);
      } else {
        await player.Notify("Sync Manager", "You've unfrozen time!", NotificationTypes.Success);
      }
    }, Ranks.Admin);
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
