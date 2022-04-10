import { Control, Game, InputMode, Vehicle } from "fivem-js";

import { Inform, Delay } from "../../utils";

export class KeepWheel {
  private tick: number = undefined;
  private angle: number;
  private currVeh: Vehicle;

  constructor() {
    Inform("Vehicle | KeepWheel Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      if (IsPedInAnyVehicle(Game.PlayerPed.Handle, false)) {
        if (GetIsTaskActive(Game.PlayerPed.Handle, 2)) {
          this.currVeh = Game.PlayerPed.CurrentVehicle;
          this.angle = this.currVeh.SteeringAngle;
          await Delay(100);
          this.currVeh.SteeringAngle = this.angle;
          
          if (this.tick !== undefined) {
            clearTick(this.tick);
            this.tick = undefined;
          }
        }
      }
    });
  }
}