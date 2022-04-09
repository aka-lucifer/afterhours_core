import { Control, Game, InputMode } from "fivem-js";

import { Delay } from "../../utils";

export class AntiControl {
  private rollTick: number = undefined;
  private airTick: number = undefined;

  constructor() {
    console.log("started anticontrol");
  }

  // Getters
  public get RollStarted(): boolean {
    return this.rollTick !== undefined;
  }
  
  public get AirStarted(): boolean {
    return this.airTick !== undefined;
  }

  // Methods
  public startRoll(): void {
    if (this.rollTick === undefined) this.rollTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;
        if (currVeh.Model.IsCar) {
          const currRoll = GetEntityRoll(currVeh.Handle);
          if ((currRoll > 75.0 || currRoll < -75.0) && currVeh.Speed < 2) {
            Game.disableControlThisFrame(InputMode.GamePad, Control.VehicleMoveLeftRight);
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

  public stopRoll(): void {
    if (this.rollTick !== undefined) {
      clearTick(this.rollTick);
      this.rollTick = undefined;
    }
  }
  
  public startAir(): void {
    if (this.airTick === undefined) this.airTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;
        if (currVeh.Model.IsCar) {
          if (currVeh.IsInAir) {
            Game.disableControlThisFrame(InputMode.GamePad, Control.VehicleMoveUpDown);
            Game.disableControlThisFrame(InputMode.GamePad, Control.VehicleMoveLeftRight);
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

  public stopAir(): void {
    if (this.airTick !== undefined) {
      clearTick(this.airTick);
      this.airTick = undefined;
    }
  }
}