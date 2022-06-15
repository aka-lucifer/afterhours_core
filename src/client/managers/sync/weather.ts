import {Client} from "../../client";
import {Events} from "../../../shared/enums/events/events";
import { Delay, Inform } from '../../utils';
import {WinterWeathers} from "../../../shared/enums/sync/weather";

export class WeatherManager {
  private client: Client;
  private weather: string;
  private weatherTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.syncWeather, this.EVENT_syncWeather.bind(this));
  }

  // Methods
  public setupTime(): void {
    this.weatherTick = setTick(async() => {
      // if (GlobalState.weatherChanging) {
      //   console.log("SLOWLY CHANGING TO", this.weather);
      //   SetWeatherTypeOverTime(this.weather, 15);
      //   await Delay(15000);
      // }

      ClearOverrideWeather();
      ClearWeatherTypePersist();
      SetWeatherTypePersist(this.weather);
      SetWeatherTypeNow(this.weather);
      SetWeatherTypeNowPersist(this.weather);

      if (this.weather == WinterWeathers.XMAS) {
        SetForceVehicleTrails(true);
        SetForcePedFootstepsTracks(true);
      } else {
        SetForceVehicleTrails(false);
        SetForcePedFootstepsTracks(false);
      }

      await Delay(1000);
    });
  }

  // Events
  public EVENT_syncWeather(newWeather: string): void {
    if (!GlobalState.weatherFrozen) {
      Inform("Recieved New Weather", newWeather);
      this.weather = newWeather;

      if (this.weatherTick === undefined) {
        this.setupTime();
      }
    }
  }
}
