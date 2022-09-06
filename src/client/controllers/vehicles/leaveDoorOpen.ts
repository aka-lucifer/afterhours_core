import { Control, Game, InputMode, VehicleClass } from "fivem-js";
import {client} from "../../client";

import { Delay, Inform } from "../../utils";

export class LeaveDoorOpen {
  private tick: number = undefined;

  constructor() {
    Inform("Vehicle | LeaveDoorOpen Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;
        if (currVeh.Model.IsCar) {
          if (currVeh.ClassType == VehicleClass.Emergency) {
            if (Game.isControlPressed(InputMode.GamePad, Control.VehicleExit) && client.death.Alive) {
              await Delay(150);
              if (Game.isControlPressed(InputMode.GamePad, Control.VehicleExit) && client.death.Alive) {
                currVeh.IsEngineRunning = true;
                TaskLeaveVehicle(myPed.Handle, currVeh.Handle, 256);
              }
            }
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
      console.log("stop leave door open!");
      clearTick(this.tick);
      this.tick = undefined;
    }
  }
}
