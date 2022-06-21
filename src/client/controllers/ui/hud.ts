import { Client } from '../../client';
import { Delay, getDirection, getLocation, getZone, Inform, speedToMph } from '../../utils';
import { Game } from 'fivem-js';
import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { Events } from '../../../shared/enums/events/events';

enum PriorityState {
  Available,
  Active,
  Unavailable
}

export class Hud {
  private client: Client;

  // Priority Data
  private activeUnits: number = 0;
  private totalUnits: number = 0;
  private priorityState: PriorityState = PriorityState.Unavailable;

  // Ticks
  private vehTick: number = undefined;
  private locationTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.updateUnits, this.EVENT_updateUnits.bind(this));
    onNet(Events.updatePriority, this.EVENT_updatePriority.bind(this));

    Inform("Hud | UI Controller", "Started!");
  }

  // Getters
  public get VehStarted(): boolean {
    return this.vehTick !== undefined;
  }

  // Methods
  public init(): void {
    this.startLocation();
  }

  public startLocation(): void {
    if (this.locationTick === undefined) this.locationTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      const [street, crossing, postal] = await getLocation(myPed);
      const direction = await getDirection(myPed);

      SendNuiMessage(JSON.stringify({
        event: NuiMessages.UpdateLocation,
        data: {
          time: this.client.timeManager.Time,
          street: street,
          crossing: crossing,
          postal: postal.code,
          direction: `${direction.toUpperCase()} Bound`
        }
      }))

      await Delay(500);
    });
  }

  public startVeh(): void {
    if (this.vehTick === undefined) this.vehTick = setTick(async() => {
      const ped = Game.PlayerPed;
      if (IsPedInAnyVehicle(ped.Handle, false)) {
        const currVeh = ped.CurrentVehicle;

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.UpdateVeh,
          data: {
            visible: true,
            mph: speedToMph(currVeh.Speed),
            rpm: currVeh.CurrentRPM,
            fuel: Math.floor(currVeh.FuelLevel),
            seatbelt: this.client.vehicleManager.seatbelt.Toggled
          }
        }));
      } else {
        await Delay(500);
      }
    });
  }

  public stopVeh(): void {
    if (this.vehTick !== undefined) {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.UpdateVeh,
        data: {
          visible: false
        }
      }));

      clearTick(this.vehTick);
      this.vehTick = undefined;
    }
  }

  // Events
  private EVENT_updateUnits(newActiveUnits: number, newUnits: number): void {
    console.log("received new units", newActiveUnits, newUnits);
    this.activeUnits = newActiveUnits;
    this.totalUnits = newUnits;

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateUnits,
      data: {
        activeUnits: this.activeUnits,
        units: this.totalUnits
      }
    }));
  }

  private EVENT_updatePriority(newPriority: PriorityState): void {
    console.log("new priority state", newPriority, this.priorityState);
    this.priorityState = newPriority;

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdatePriority,
      data: {
        priority: this.priorityState
      }
    }));
  }
}
