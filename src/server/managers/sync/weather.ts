import {Server} from "../../server";
import {Capitalize, enumMatches, Error, Inform, randomEnum} from "../../utils";

import {Player} from "../../models/database/player";
import {Command} from "../../models/ui/chat/command";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";

import { LogTypes } from "../../enums/logging";

import {Weathers, WinterWeathers} from "../../../shared/enums/sync/weather";
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/chat/types";
import {Ranks} from "../../../shared/enums/ranks";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../../shared/enums/logging/embedColours";

import serverConfig from "../../../configs/server.json";
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
    GlobalState.winterWeather = this.winterWeather;
    this.setFrozen(false);
    this.setChanging(false);
  }

  public get WinterWeather(): boolean {
    return this.winterWeather;
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

  private isWinterWeather(weatherType: string): boolean {
    const winterWeathers = Object.keys(WinterWeathers);
    const weatherIndex = winterWeathers.findIndex(winterWeather => winterWeather.toUpperCase() == weatherType);
    return weatherIndex !== -1;
  }

  public async setWeather(newWeather: string, manually: boolean, changedBy?: Player): Promise<void> {
    this.currentWeather = newWeather;
    GlobalState.Weather = newWeather;

    if (this.isWinterWeather(this.currentWeather)) {
      // If the new weather is a winter weather, and our winter weather bool and convar is false, set both to true
      if (!this.winterWeather) {
        SetConvar("xmas_weather", "true");
        this.winterWeather = true;
        GlobalState.winterWeather = true;
      }
    } else {
      // If the new weather is a winter weather, and our winter weather bool and convar are both true, set both to false
      if (this.winterWeather) {
        SetConvar("xmas_weather", "false");
        this.winterWeather = false;
        GlobalState.winterWeather = false;
      }
    }

    if (manually) {
      const svPlayers = this.server.connectedPlayerManager.GetPlayers;
      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].Spawned) await svPlayers[i].TriggerEvent(Events.syncWeather, this.currentWeather);
      }
      this.setChanging(true);

      setTimeout(() => {
        this.setChanging(false);
      }, serverConfig.syncing.time.secondInterval);

      if (changedBy !== undefined) {
        const changersDisc = await changedBy.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Weather Changing__",
          description: `The weather has changed.\n\n**Weather**: ${Capitalize(newWeather.toLowerCase())}\n**Changed By**: ${changedBy.GetName}\n**Rank**: ${Ranks[changedBy.Rank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Weather Changing__",
          description: `The weather has changed.\n\n**Weather**: ${Capitalize(newWeather.toLowerCase())}\n**Changed By**: Console`,
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
    if (this.server.Developing) { // If server is development server, then select random weather (sunny / xmas if winter weather toggled)
      if (this.winterWeather) {
        await this.setWeather(WinterWeathers.XMAS, false);
      } else {
        await this.setWeather(Weathers.ExtraSunny, false);
      }
    } else { // If normal server, select a random weather type
      await this.setWeather(this.randomWeather(), false);
    }
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

        const changersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
          color: EmbedColours.Red,
          title: "__Weather Frozen__",
          description: `The weather has been frozen.\n\n**Frozen By**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        await player.Notify("Sync Manager", "You've unfrozen weather!", NotificationTypes.Success);

        const changersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Weather Unfrozen__",
          description: `The weather has been unfrozen.\n\n**Unfrozen By**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${changersDisc != "Unknown" ? `<@${changersDisc}>` : changersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
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
            Error("Weather Manager", "You can't change the server's weather, as the weather is frozen!");
          }
        } else {
          Error("Weather Manager", "Server weather is already changing!");
        }
      }
    }, false);
    
    RegisterCommand("freezeweather", async(source: string) => {
      if (parseInt(source) <= 0) {
        this.setFrozen(!this.weatherFrozen);
        if (this.weatherFrozen) {
          Inform("Weather Manager", `Weather frozen`);

          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Weather Frozen__",
            description: `The weather has been frozen.\n\n**Frozen By**: Console`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        } else {
          Inform("Weather Manager", `Weather unfrozen`);

          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Weather Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Weather Unfrozen__",
            description: `The weather has been unfrozen.\n\n**Unfrozen By**: Console`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      }
    }, false);
  }

  public async sync(player: Player): Promise<void> {
    await player.TriggerEvent(Events.syncWeather, this.currentWeather);
  }
}
