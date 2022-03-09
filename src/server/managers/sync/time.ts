import {Server} from "../../server";

import {addZero, Capitalize, Error, Inform, randomBetween} from "../../utils";

import {Player} from "../../models/database/player";
import {Command} from "../../models/ui/chat/command";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";

import { LogTypes } from "../../enums/logTypes";

import {Events} from "../../../shared/enums/events/events";
import {Ranks} from "../../../shared/enums/ranks";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../../shared/enums/embedColours";

import serverConfig from "../../../configs/server.json";
import sharedConfig from "../../../configs/shared.json";

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
    this.setFrozen(false);
    this.setChanging(false);
  }

  // Methods
  private setFrozen(newState: boolean): void {
    this.timeFrozen = newState;
    GlobalState.timeFrozen = newState;
  }

  private setChanging(newState: boolean): void {
    this.timeChanging = newState;
    GlobalState.timeChanging = newState;
  }

  public async init(): Promise<void> {
    this.hour = randomBetween(serverConfig.syncing.time.starter.hour.minimum, serverConfig.syncing.time.starter.hour.maxium);
    this.minute = randomBetween(serverConfig.syncing.time.starter.time.minimum, serverConfig.syncing.time.starter.time.maxium);
    this.setFormattedTime();
    this.registerCommands();
  }

  private async changeTime(hour: number, minute: number, overTime: boolean, changedBy?: Player): Promise<void> {
    if (overTime) {
      setTimeout(() => {
        this.hour = hour;
        this.minute = minute;
        this.setFormattedTime();
        emitNet(Events.syncTime, -1, this.hour, this.minute);
        this.setChanging(false);
      }, serverConfig.syncing.time.secondInterval);

      if (changedBy !== undefined) {
        const changersDisc = await changedBy.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Time Changed__",
          description: `The time has changed.\n\n**Time**: ${addZero(hour)}:${addZero(minute)}\n**Changed By**: ${changedBy.GetName}\n**Rank**: ${Ranks[changedBy.GetRank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Time Changed__",
          description: `The time has changed.\n\n**Time**: ${addZero(hour)}:${addZero(minute)}\n**Changed By**: Console`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    } else {
      this.hour = hour;
      this.minute = minute;
      this.setFormattedTime();
      emitNet(Events.syncTime, -1, this.hour, this.minute);
      this.setChanging(false);
    }
  }

  private registerCommands(): void {
    new Command("morning", "Set the time to morning", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        if (!this.timeFrozen) {
          this.setChanging(true);

          emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to morning in 15 seconds.`, SystemTypes.Success));
          await this.changeTime(serverConfig.syncing.time.commands.morning.hour, serverConfig.syncing.time.commands.morning.minute, true, player);
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change server time, as the time is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("day", "Set the time to day", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        if (!this.timeFrozen) {
          this.setChanging(true);

          emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to day in 15 seconds.`, SystemTypes.Success));
          await this.changeTime(serverConfig.syncing.time.commands.day.hour, serverConfig.syncing.time.commands.day.minute, true, player);
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change server time, as the time is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);
    
    new Command("night", "Set the time to night", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        if (!this.timeFrozen) {
          this.setChanging(true);

          emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to night in 15 seconds.`, SystemTypes.Success));
          await this.changeTime(serverConfig.syncing.time.commands.night.hour, serverConfig.syncing.time.commands.night.minute, true, player);
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change server time, as the time is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("time", "Set the time to morning", [{name: "hour", help: "The hour to set the time to."}, {name: "minute", help: "The minute to set the time to."}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.timeChanging) {
        if (!this.timeFrozen) {
          if (!isNaN(args[0])) {
            if (!isNaN(args[1])) {
              this.setChanging(true);
              
              emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to (${addZero(args[0])}:${addZero(args[1])}) in 15 seconds.`, SystemTypes.Success));
              await this.changeTime(args[0], args[1], true, player);
            } else {
              await player.TriggerEvent(Events.sendSystemMessage, new Message("Minute argument entered isn't a number!", SystemTypes.Error));
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("Hour argument entered isn't a number!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change server time, as the time is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server time is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("freezetime", "Freeze the time", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      this.setFrozen(!this.timeFrozen);
      emitNet(Events.freezeTime, -1);
      if (this.timeFrozen) {
        await player.Notify("Sync Manager", "You've frozen time!", NotificationTypes.Success);

        const changersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Time Frozen__",
          description: `The time has been frozen.\n\n**Frozen By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        await player.Notify("Sync Manager", "You've unfrozen time!", NotificationTypes.Success);

        const changersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Time Unfrozen__",
          description: `The time has been unfrozen.\n\n**Unfrozen By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    }, Ranks.Admin);

    // RCON Commands
    RegisterCommand("morning", async(source: string) => {
      if (parseInt(source) <= 0) {
        if (!this.timeChanging) {
          if (!this.timeFrozen) {
            this.setChanging(true);
      
            emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to morning in 15 seconds.`, SystemTypes.Success));
            Inform("Time Manager", `Changing time to ${addZero(serverConfig.syncing.time.commands.morning.hour)}: ${addZero(serverConfig.syncing.time.commands.morning.minute)}`);
            await this.changeTime(serverConfig.syncing.time.commands.morning.hour, serverConfig.syncing.time.commands.morning.minute, true);
          } else {
            Error("Time Manager", "You can't change server time, as the time is frozen!");
          }
        } else {
          Error("Time Manager", "Server time is already changing!");
        }
      }
    }, false);
    
    RegisterCommand("day", async(source: string) => {
      if (parseInt(source) <= 0) {
        if (!this.timeChanging) {
          if (!this.timeFrozen) {
            this.setChanging(true);
      
            emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to day in 15 seconds.`, SystemTypes.Success));
            Inform("Time Manager", `Changing time to ${addZero(serverConfig.syncing.time.commands.day.hour)}: ${addZero(serverConfig.syncing.time.commands.day.minute)}`);
            await this.changeTime(serverConfig.syncing.time.commands.day.hour, serverConfig.syncing.time.commands.day.minute, true);
          } else {
            Error("Time Manager", "You can't change server time, as the time is frozen!");
          }
        } else {
          Error("Time Manager", "Server time is already changing!");
        }
      }
    }, false);
    
    RegisterCommand("night", async(source: string) => {
      if (parseInt(source) <= 0) {
        if (!this.timeChanging) {
          if (!this.timeFrozen) {
            this.setChanging(true);
      
            emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to night in 15 seconds.`, SystemTypes.Success));
            Inform("Time Manager", `Changing time to ${addZero(serverConfig.syncing.time.commands.night.hour)}: ${addZero(serverConfig.syncing.time.commands.night.minute)}`);
            await this.changeTime(serverConfig.syncing.time.commands.night.hour, serverConfig.syncing.time.commands.night.minute, true);
          } else {
            Error("Time Manager", "You can't change server time, as the time is frozen!");
          }
        } else {
          Error("Time Manager", "Server time is already changing!");
        }
      }
    }, false);
    
    RegisterCommand("time", async(source: string, args: any[]) => {
      if (parseInt(source) <= 0) {
        if (!this.timeChanging) {
          if (!this.timeFrozen) {
            if (!isNaN(args[0])) {
              if (!isNaN(args[1])) {
                this.setChanging(true);
                
                emitNet(Events.sendSystemMessage, -1, new Message(`The time will change to (${addZero(args[0])}:${addZero(args[1])}) in 15 seconds.`, SystemTypes.Success));
                Inform("Time Manager", `Changing time to ${addZero(args[0])}:${addZero(args[1])}`);
                await this.changeTime(args[0], args[1], true);
              } else {
                Error("Time Manager", "Minute argument entered isn't a number!");
              }
            } else {
              Error("Time Manager", "Hour argument entered isn't a number!");
            }
          } else {
            Error("Time Manager", "You can't change server time, as the time is frozen!");
          }
        } else {
          Error("Time Manager", "Server time is already changing!");
        }
      }
    }, false);

    RegisterCommand("freezetime", async(source: string) => {
      if (parseInt(source) <= 0) {
        this.setFrozen(!this.timeFrozen);
        emitNet(Events.freezeTime, -1);
        if (this.timeFrozen) {
          Inform("Time Manager", `Time frozen`);

          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Time Frozen__",
            description: `The time has been frozen.\n\n**Frozen By**: Console`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        } else {
          Inform("Time Manager", `Time unfrozen`);

          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Time Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Time Unfrozen__",
            description: `The time has been unfrozen.\n\n**Unfrozen By**: Console`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      }
    }, false);
  }

  private setFormattedTime(): void {
    GlobalState.time = `${addZero(this.hour)}:${addZero(this.minute)}`;
    this.time = GlobalState.time;
  }

  public startTime(): void {
    this.timeInterval = setInterval(() => { // 21,600 seconds (6 hours | 1,440 times) - Is a full day
      if (!this.timeFrozen) {
        const tempTime = GlobalState.time;

        this.minute++;
        if (this.minute > 60) {
          this.hour++;
          if (this.hour >= 24) {
            this.hour = 0;
          }
          this.minute = 0;
        }

        this.setFormattedTime();

        // console.log(`Old Time: ${tempTime} | New Time: ${this.time}`, this.hour, this.minute);
        emitNet(Events.syncTime, -1, this.hour, this.minute);
      }
    }, serverConfig.syncing.time.secondInterval);
  }

  public async sync(player: Player): Promise<void> {
    await player.TriggerEvent(Events.syncTime, this.hour, this.minute);
  }
}
