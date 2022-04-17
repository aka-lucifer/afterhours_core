import { Control, Game, InputMode, Vehicle } from 'fivem-js';

import { Delay, Inform } from '../../utils';

export class KeepWheel {
  private tick: number = undefined;

  // Save Inside
  private savedAngle: number = 0.0;

  // Save On Exit
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
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;
        const wheelAngle = currVeh.SteeringAngle;

        if (wheelAngle < -0.1 || wheelAngle > 0.1) {
          if (this.savedAngle !== undefined) {
            currVeh.SteeringAngle = this.savedAngle;
          }

          if (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.VehicleMoveLeftOnly) || Game.isControlPressed(InputMode.MouseAndKeyboard, Control.VehicleMoveRightOnly) || Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.VehicleMoveRightOnly)) {
            if (wheelAngle < 0) {
              this.savedAngle = wheelAngle + -10; // Add -10 to wheel angle to get the correct measurement
            } else {
              this.savedAngle = wheelAngle + 10; // Add 10 to wheel angle to get the correct measurement
            }
          }

          if (GetIsTaskActive(Game.PlayerPed.Handle, 2)) {
            this.angle = currVeh.SteeringAngle;
            await Delay(100);
            currVeh.SteeringAngle = this.angle;

            if (this.tick !== undefined) {
              clearTick(this.tick);
              this.tick = undefined;
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
}
