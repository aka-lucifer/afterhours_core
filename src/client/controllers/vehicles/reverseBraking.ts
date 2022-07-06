import { Delay, Inform, NumToVector3 } from '../../utils';
import { Control, Game, InputMode, VehicleClass } from 'fivem-js';

export class ReverseBraking {
  private brakingForward: boolean = false;
  private brakingReverse: boolean = false;
  private tick: number = undefined;

  constructor() {
    Inform("Vehicle | ReverseBraking Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  // Methods
  private getRange(input: number, originalMin: number, originalMax: number, newBegin: number, newEnd: number, curve: number): number {
    let originalRange = 0.0;
    let newRange = 0.0;
    let zeroRefCurVal = 0.0;
    let normalizedCurVal = 0.0;
    let rangedValue = 0.0;
    let invFlag = 0;

    if (curve > 10.0) curve = 10.0;
    if (curve < -10.0) curve = -10.0;

    curve = (curve * -.1);
    curve = 10.0 ^ curve;

    if (input < originalMin) {
      input = originalMin;
    }

    if (input > originalMax) {
      input = originalMax;
    }

    originalRange = originalMax - originalMin;

    if (newEnd > newBegin) {
      newRange = newEnd - newBegin;
    } else {
      newRange = newBegin - newEnd;
      invFlag = 1;
    }

    zeroRefCurVal = input - originalMin;
    normalizedCurVal = zeroRefCurVal / originalRange;

    if (originalMin > originalMax) {
      return 0;
    }

    if (invFlag === 0) {
      rangedValue = ((normalizedCurVal ^ curve) * newRange) + newBegin;
    } else {
      rangedValue = newBegin - ((normalizedCurVal ^ curve) * newRange);
    }

    return rangedValue;
  }

  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      const myPed = Game.PlayerPed;

      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;

        if (currVeh.ClassType !== VehicleClass.Boats) {
          const accelerator = GetControlValue(InputMode.GamePad, Control.VehicleAccelerate);
          const brake = GetControlValue(InputMode.GamePad, Control.VehicleBrake);
          const vehSpeed = NumToVector3(GetEntitySpeedVector(currVeh.Handle, true));
          let brakeForce = 1.0;

          if (vehSpeed.y >= 1.0) {
            if (brake > 127) {
              // Forward & Braking
              this.brakingForward = true;
              brakeForce = this.getRange(brake, 127.0, 254.0, 0.01, 1.0, 1.0-(5.0*2.0));
            }
          } else if (vehSpeed.y <= -1.0) {
            // Reversing & Braking
            if (accelerator > 127) {
              this.brakingReverse = true;
              brakeForce = this.getRange(accelerator, 127.0, 254.0, 0.01, brakeForce, 10.0-(5.0*2.0));
            }
          } else {
            // Stopped or almost stopped/sliding sideways
            if (currVeh.Speed < 1) {
              // Not sliding sideways
              if (this.brakingForward) {
                // Stopped or going slightly forward while braking
                Game.disableControlThisFrame(InputMode.GamePad, Control.VehicleBrake); // Disable brake until user lets go of brake
                SetVehicleForwardSpeed(currVeh.Handle, vehSpeed.y * 0.98);
                SetVehicleBrakeLights(currVeh.Handle, true);
              }

              if (this.brakingReverse) {
                // Stopped or going slightly in reverse while braking
                Game.disableControlThisFrame(InputMode.GamePad, Control.VehicleAccelerate); // Disable reverse brake until user lets go of reverse brake (Accelerator)
                SetVehicleForwardSpeed(currVeh.Handle, vehSpeed.y * 0.98);
                SetVehicleBrakeLights(currVeh.Handle, true);

              }

              if (this.brakingForward && GetDisabledControlNormal(InputMode.GamePad, Control.VehicleBrake) === 0) {
                // We let go of the brake
                this.brakingForward = false;
              }

              if (this.brakingReverse && GetDisabledControlNormal(InputMode.GamePad, Control.VehicleAccelerate) === 0) {
                // We let go of the reverse brake (Accelerator)
                this.brakingReverse = false;
              }
            }
          }

          if (brakeForce > (1.0 - 0.02)) brakeForce = 1.0; // Make sure we can brake max.
          SetVehicleHandlingFloat(currVeh.Handle, "CHandlingData", "fBrakeForce", brakeForce); // Set new Brake Force multiplier
        } else {
          await Delay(1000);
        }
      } else {
        await Delay(1000);
      }
    });
  }

  public stop(): void {
    if (this.tick !== undefined) {
      clearTick(this.tick);
      this.tick = undefined;
    }
  }
}
