import {Server} from "../../server";
import {Capitalize, enumMatches, Error, Inform, randomEnum} from "../../utils";

import {Player} from "../../models/database/player";
import {Command} from "../../models/ui/chat/command";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";

import { LogTypes } from "../../enums/logTypes";

import {Weathers, WinterWeathers} from "../../../shared/enums/sync/weather";
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";
import {Ranks} from "../../../shared/enums/ranks";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import serverConfig from "../../../configs/server.json";
import { EmbedColours } from "../../../shared/enums/embedColours";
import sharedConfig from "../../../configs/shared.json";

export class WeatherManager {
  private server: Server;

  // Weather
  private winterWeather: boolean;
  private currentWeather: string;

  // Weather Controlling
  private weatherFrozen: boolean;
  private weatherChanging: boolean;

  constructor(server: Server) {
    this.server = server;
    this.winterWeather = (GetConvar('xmas_weather', 'false') === "true");
    this.setFrozen(false);
    this.setChanging(false);
  }

  // Methods
  private setFrozen(newState: boolean): void {
    this.weatherFrozen = newState;
    GlobalState.weatherFrozen = newState;
  }

  private setChanging(newState: boolean): void {
    this.weatherChanging = newState;
    GlobalState.weatherChanging = newState;
  }

  private async setWeather(newWeather: string, manually: boolean, changedBy?: Player): Promise<void> {
    this.currentWeather = newWeather;
    GlobalState.Weather = newWeather;

    if (manually) {
      emitNet(Events.syncWeather, -1, this.currentWeather); // Sync weather to all clients
      this.setChanging(true);

      setTimeout(() => {
        this.setChanging(false);
      }, serverConfig.syncing.time.secondInterval);

      if (changedBy !== undefined) {
        const changersDisc = await changedBy.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Weather Changing__",
          description: `The weather has been changed.\n\n**Weather**: ${Capitalize(newWeather.toLowerCase())}\n**Changed By**: ${changedBy.GetName}\n**Rank**: ${Ranks[changedBy.GetRank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Weather Changing__",
          description: `The weather has been changed.\n\n**Weather**: ${Capitalize(newWeather.toLowerCase())}\n**Changed By**: Console`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    }
  }

  public randomWeather(): string {
    let weatherType;
    if (this.winterWeather) {
      weatherType = randomEnum(WinterWeathers);
    } else {
      weatherType = randomEnum(Weathers);
    }

    weatherType = weatherType.toString();
    return weatherType;
  }

  public async init(): Promise<void> {
    await this.setWeather(this.randomWeather(), false);
    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("weather", "Set the time to morning", [{name: "Weather Type", help: "The weather type to change to"}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (!this.weatherChanging) {
        if (!this.weatherFrozen) {
          if (isNaN(args[0])) {
            const weatherType = args[0].toUpperCase();

            if (!this.winterWeather) {
              const [type, matches] = await enumMatches(Weathers, weatherType)
              if (matches) {
                await this.setWeather(weatherType, true, player);
                await player.Notify("Weather", `Changing weather to ${type}`, NotificationTypes.Success);
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Entered weather type doesn't exist!", SystemTypes.Error));
              }
            } else {
              const [type, matches] = await enumMatches(WinterWeathers, weatherType)
              if (matches) {
                await this.setWeather(weatherType, true, player);
                await player.Notify("Weather", `Changing weather to ${type}`, NotificationTypes.Success);
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Entered weather type doesn't exist!", SystemTypes.Error));
              }
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("You have entered a number, not a weather type!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change the server's weather, as the weather is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server weather is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("freezeweather", "Freeze the weather", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      this.setFrozen(!this.weatherFrozen);
      if (this.weatherFrozen) {
        await player.Notify("Sync Manager", "You've frozen weather!", NotificationTypes.Success);
      } else {
        await player.Notify("Sync Manager", "You've unfrozen weather!", NotificationTypes.Success);
      }
    }, Ranks.Admin);

    // RCON Commands
    RegisterCommand("weather", async(source: string, args: any[]) => {
      if (parseInt(source) <= 0) {
        if (!this.weatherChanging) {
          if (!this.weatherFrozen) {
            if (isNaN(args[0])) {
              const weatherType = args[0].toUpperCase();
  
              if (!this.winterWeather) {
                const [type, matches] = await enumMatches(Weathers, weatherType)
                if (matches) {
                  await this.setWeather(weatherType, true);
                  Inform("Weather Manager", `Changing weather to ${type}`);
                } else {
                  Error("Weather Manager", "Entered weather type doesn't exist!");
                }
              } else {
                const [type, matches] = await enumMatches(WinterWeathers, weatherType)
                if (matches) {
                  await this.setWeather(weatherType, true);
                  Inform("Weather Manager", `Changing weather to ${type}`);
                } else {
                  Error("Weather Manager", "Entered weather type doesn't exist!");
                }
              }
            } else {
              Error("Weather Manager", "You have entered a number, not a weather type!");
            }
          } else {
            Inform("Weather Manager", "You can't change the server's weather, as the weather is frozen!");
          }
        } else {
          Inform("Weather Manager", "Server weather is already changing!");
        }
      }
    }, false);
    
    RegisterCommand("freezeweather", async(source: string) => {
      if (parseInt(source) <= 0) {
        this.setFrozen(!this.weatherFrozen);
        if (this.weatherFrozen) {
          Inform("Weather Manager", `Weather frozen`);
        } else {
          Inform("Weather Manager", `Weather unfrozen`);
        }
      }
    }, false);
  }

  public async sync(player: Player): Promise<void> {
    await player.TriggerEvent(Events.syncWeather, this.currentWeather);
  }
}
