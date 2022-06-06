import { Game, VehicleSeat } from 'fivem-js';

import { Delay, Inform } from '../../utils';

import { Events } from '../../../shared/enums/events/events';

export class Shuffling {
  private shufflingDisabled: boolean = false;
  private tick: number = undefined;

  constructor() {
    Inform("Vehicle | Shuffling Controller", "Started!");

    // Events
    onNet(Events.shuffleSeats, this.EVENT_shuffleSeats.bind(this));
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      if (!this.shufflingDisabled) {
        const myPed = Game.PlayerPed;
        if (IsPedInAnyVehicle(myPed.Handle, false)) {
          const currVeh = myPed.CurrentVehicle;
          if (!currVeh.Model.IsBike && !currVeh.Model.IsBicycle && !currVeh.Model.IsQuadbike) {
            if (GetPedInVehicleSeat(currVeh.Handle, VehicleSeat.Passenger) === myPed.Handle) {
              if (!GetIsTaskActive(myPed.Handle, 164) && GetIsTaskActive(myPed.Handle, 165)) {
                myPed.setIntoVehicle(currVeh, VehicleSeat.Passenger);
              }
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        } else {
          await Delay(500);
        }
      } else {
        await Delay(500);
      }
    });
  }

  public stop(): void {
    if (this.tick !== undefined) {
      clearTick(this.tick);
      this.tick = undefined;
    }
  }

  // Events
  private EVENT_shuffleSeats(): void {
    this.shufflingDisabled = true;
    setTimeout(() => {
      this.shufflingDisabled = false;
    }, 3000);
  }
}
