import {Server} from "../../server";
import {enumMatches, randomEnum} from "../../utils";

import {Command} from "../../models/ui/chat/command";

import {Weathers, WinterWeathers} from "../../../shared/enums/sync/weather";
import {Events} from "../../../shared/enums/events/events";
import {Message} from "../../../shared/models/ui/chat/message";
import {SystemTypes} from "../../../shared/enums/ui/types";
import {Ranks} from "../../../shared/enums/ranks";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import serverConfig from "../../../configs/server.json";
import {Player} from "../../models/database/player";

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

  private async setWeather(newWeather: string, manually: boolean): Promise<void> {
    this.currentWeather = newWeather;
    GlobalState.Weather = newWeather;

    if (manually) {
      this.setChanging(true);
      setTimeout(() => {
        this.setChanging(false);
      }, serverConfig.syncing.time.secondInterval);
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
                await this.setWeather(weatherType, true);
                emitNet(Events.syncWeather, -1, this.currentWeather);
                await player.Notify("Weather", `Changing weather to ${type}`, NotificationTypes.Success);
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Entered weather type doesn't exist!", SystemTypes.Error));
              }
            } else {
              const [type, matches] = await enumMatches(WinterWeathers, weatherType)
              if (matches) {
                await this.setWeather(weatherType, true);
                emitNet(Events.syncWeather, -1, this.currentWeather);
                await player.Notify("Weather", `Changing weather to ${type}`, NotificationTypes.Success);
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Entered weather type doesn't exist!", SystemTypes.Error));
              }
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("You have entered a number, not a weather type!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't change the servers weather, as the weather is frozen!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Server weather is already changing!", SystemTypes.Error));
      }
    }, Ranks.Admin);

    new Command("freezeweather", "Freeze the weather", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      this.setFrozen(!this.weatherFrozen);
      // emitNet(Events.freezeWeather, -1);
      if (this.weatherFrozen) {
        await player.Notify("Sync Manager", "You've frozen weather!", NotificationTypes.Success);
      } else {
        await player.Notify("Sync Manager", "You've unfrozen weather!", NotificationTypes.Success);
      }
    }, Ranks.Admin);
  }

  public async sync(player: Player): Promise<void> {
    await player.TriggerEvent(Events.syncWeather, this.currentWeather);
  }
}
