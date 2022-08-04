import { Control, Game, InputMode, Ped, Screen, Vehicle } from "fivem-js";
import { NumToVector3 } from "../../../shared/utils";

import { Delay, Inform, speedToMph } from "../../utils";

export class CruiseControl {
  // Player Data
  private ped: Ped;
  private vehicle: Vehicle;

  // Speed Data
  private speed: number;
  private formattedSpeed: number;

  // Booleans
  private active: boolean = false;
  private holding: boolean = false;
  private sentNotify: boolean = false;

  // Ticks
  private tick: number = undefined;

  constructor() {
    // Key Mapping Commands
    RegisterCommand("+start_cruise", () => {
      if (!this.active) {
        this.start()
      } else {
        if (this.vehicle.Model.IsCar || this.vehicle.Model.IsBike || this.vehicle.Model.IsQuadbike) {
          Screen.showNotification("~r~Cruise control disabled!");
          this.stop();
        }
      }
    }, false);
    
    Inform("Vehicle | Cruise Control Controller", "Started!");
  }

  // Methods
  private start(): void {
    this.ped = Game.PlayerPed;
    if (IsPedInAnyVehicle(this.ped.Handle, false)) {
      if (!this.active) this.active = true;
      this.vehicle = this.ped.CurrentVehicle;
      if (this.vehicle.Model.IsCar || this.vehicle.Model.IsBike || this.vehicle.Model.IsQuadbike) {
        if (this.vehicle.Driver.Handle == this.ped.Handle) {
          const speedVector = NumToVector3(GetEntitySpeedVector(this.vehicle.Handle, true));
          if (speedVector.y > 0) {
            this.speed = this.vehicle.Speed;
            this.formattedSpeed = speedToMph(this.vehicle.Speed);
            if (!this.sentNotify) {
              this.sentNotify = true;
              Screen.showNotification(`Cruise control set to ~y~${Math.ceil(this.formattedSpeed)}~w~MPH`);
            }

            if (this.tick === undefined) this.tick = setTick(async() => {
              if (this.ped.Handle !== Game.PlayerPed.Handle) this.ped = Game.PlayerPed;
              if (IsPedInAnyVehicle(this.ped.Handle, false)) {
                if (this.vehicle.Handle !== this.ped.CurrentVehicle.Handle) this.vehicle = this.ped.CurrentVehicle;

                if (this.speed > 0) {
                  if (this.vehicle.IsOnAllWheels) {
                    // console.log("set", this.vehicle.Handle, "to", this.speed);
                    SetVehicleForwardSpeed(this.vehicle.Handle, this.speed);
                  } else {
                    Screen.showNotification("~r~Cruise Control Disabled (Due to losing ground traction)!");
                    this.stop();
                  }

                  if (this.vehicle.HasCollided) {
                    Screen.showNotification("~r~Cruise Control Disabled (Due to collision)!");
                    this.stop();
                  }

                  // 
                  if (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.VehicleAccelerate)) {
                    await Delay(500);
                    if (!this.holding) {
                      this.holding = true;
                    }

                    if (!this.vehicle.HasCollided) {
                      this.speed = this.vehicle.Speed;
                      this.formattedSpeed = speedToMph(this.vehicle.Speed);
                      SetVehicleForwardSpeed(this.vehicle.Handle, this.speed);
                    }
                  }

                  if (Game.isControlReleased(InputMode.MouseAndKeyboard, Control.VehicleAccelerate)) {
                    if (this.holding) {
                      this.holding = false;
                      Screen.showNotification(`Cruise control updated to ~y~${Math.ceil(this.formattedSpeed)}~w~MPH`);
                    }
                  }

                  // Disable if brake pressed
                  if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.VehicleBrake) || Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.VehicleHandbrake)) {
                    Screen.showNotification("~r~Cruise control disabled!");
                    this.stop();
                  }
                } else {
                  await Delay(500);
                }
              } else {
                if (this.tick !== undefined) this.stop();
              }
            });
          }
        }
      }
    }
  }

  private stop(): void {
    if (this.tick !== undefined) {
      clearTick(this.tick);
      this.tick = undefined;
      this.speed = undefined;
      this.formattedSpeed = undefined;
      this.sentNotify = false;
      if (this.active) this.active = false;
    }
  }
}
