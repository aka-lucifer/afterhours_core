import { Game } from 'fivem-js';

import { Client } from '../../client';
import { Delay, getDirection, getLocation, Inform, speedToMph } from '../../utils';

import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { Events } from '../../../shared/enums/events/events';
import { Notification } from '../../models/ui/notification';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';

enum PriorityState {
  Available,
  Active,
  Unavailable
}

export class Hud {
  private client: Client;

  private hudActive: boolean = true;
  private vehActive: boolean = false;

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

    // Keybindings
    RegisterCommand("+toggle_hud", this.toggleHud.bind(this), false);

    Inform("Hud | UI Controller", "Started!");
  }

  // Getters
  public get Active(): boolean {
    return this.hudActive;
  }

  public set Active(newState: boolean) {
    this.hudActive = newState;
    DisplayRadar(this.hudActive);

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateHud,
      data: {
        active: this.hudActive
      }
    }));
  }

  public get VehStarted(): boolean {
    return this.vehTick !== undefined;
  }

  // Methods
  public init(): void {
    this.Active = true;
    this.startLocation();
  }

  private async toggleHud(): Promise<void> {
    if (!this.hudActive) { // If the hud is hidden, enable it
      this.Active = true; // Set the hud enabled to true
      this.startLocation(); // Start the location HUD
      if (this.vehActive) { // If the veh HUD was showing, start the vehicle hud
        this.vehActive = false;
        this.startVeh();
      }

      const notification = new Notification("HUD", "You have enabled the hud.", NotificationTypes.Info);
      await notification.send();
    } else {
      this.Active = false; // Set the hud enabled to false
      this.stopLocation(); // Stop the location HUD

      if (this.VehStarted) { // If the vehicle HUD is started, define it and stop it
        this.vehActive = true;
        this.stopVeh();
      }

      const notification = new Notification("HUD", "You have hidden the hud!", NotificationTypes.Error);
      await notification.send();
    }
  }

  public startLocation(): void {
    if (this.locationTick === undefined) this.locationTick = setTick(async() => {
      if (this.hudActive) {
        const myPed = Game.PlayerPed;
        const [street, crossing, postal] = await getLocation(myPed);
        const direction = await getDirection(myPed);

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.UpdateLocation,
          data: {
            visible: true,
            time: this.client.timeManager.Time,
            street: street,
            crossing: crossing,
            postal: postal.code,
            direction: `${direction.toUpperCase()} Bound`
          }
        }))

        await Delay(500);
      } else {
        await Delay(500);
      }
    });
  }

  public stopLocation(): void {
    if (this.locationTick !== undefined) {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.UpdateLocation,
        data: {
          visible: false
        }
      }));

      clearTick(this.locationTick);
      this.locationTick = undefined;
    }
  }

  public startVeh(): void {
    if (this.vehTick === undefined) this.vehTick = setTick(async() => {
      if (this.hudActive) {
        const ped = Game.PlayerPed;
        if (IsPedInAnyVehicle(ped.Handle, false)) {
          const currVeh = ped.CurrentVehicle;
          let gear = "";

          if (currVeh.IsStopped) {
            gear = "P";
          } else if (currVeh.CurrentGear === 0) {
            gear = "R";
          } else {
            gear = currVeh.CurrentGear.toString();
          }

          SendNuiMessage(JSON.stringify({
            event: NuiMessages.UpdateVeh,
            data: {
              visible: true,
              speed: speedToMph(currVeh.Speed),
              fuel: Math.floor(currVeh.FuelLevel),
              gear: gear,
              seatbelt: this.client.vehicleManager.seatbelt.Toggled ? "ON" : "OFF",
              motorcycle: currVeh.Model.IsBicycle || currVeh.Model.IsQuadbike || currVeh.Model.IsBike
            }
          }));
        } else {
          await Delay(500);
        }
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
    this.priorityState = newPriority;

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdatePriority,
      data: {
        priority: this.priorityState
      }
    }));
  }
}
