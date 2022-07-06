import { Game, Vector3, Vehicle, VehicleSeat } from 'fivem-js';

import { Client } from '../../client';
import { Delay, getVehPassengers, Inform, NumToVector3, speedToMph } from '../../utils';

import { Notification } from '../../models/ui/notification';

import { Events } from '../../../shared/enums/events/events';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { Sounds } from '../../../shared/enums/sounds';

export class Seatbelt {
  private client: Client;
  private seatbeltToggled: boolean = false;

  private ticks: number = 0;
  private oldFrameSpeed: number = 0;
  private newFrameSpeed: number = 0;
  
  private currBodyHealth: number = 0;
  private currEngineHealth: number = 0;
  private newBodyHealth: number = 0;
  private newEngineHealth: number = 0;

  private frameDiff: number = 0;
  private vehVelocity: Vector3;
  private damaged: boolean = false;
  private lastVehicle: Vehicle;
  private tick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Vehicle | Seatbelt Controller", "Started!");

    // Keybindings
    RegisterCommand("+toggle_seatbelt", this.toggleSeatbelt.bind(this), false);

    // Events
    onNet(Events.ejectFromVeh, this.EVENT_ejectFromVeh.bind(this));
    onNet(Events.harmPassenger, this.EVENT_harmPassenger.bind(this));
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  public get Toggled(): boolean {
    return this.seatbeltToggled;
  }

  // Methods
  private async toggleSeatbelt(): Promise<void> {
    const myPed = Game.PlayerPed;
    if (IsPedInAnyVehicle(myPed.Handle, false)) {
      const currVeh = myPed.CurrentVehicle;

      if (!currVeh.Model.IsBicycle && !currVeh.Model.IsBike || !currVeh.Model.IsBike) {
        this.updateState(!this.seatbeltToggled);

        if (this.seatbeltToggled) {
          console.log("toggle seatbelt & play sound");
          const notify = new Notification("Seatbelt", "You've toggled your seatbelt", NotificationTypes.Success);
          await notify.send();

          global.exports["xsound"].PlayUrl("seatbeltOn", Sounds.SeatbeltOn, 0.3, false);
        } else {
          console.log("remove seatbelt & stop sound");

          const notify = new Notification("Seatbelt", "You've removed your seatbelt", NotificationTypes.Error);
          await notify.send();
          global.exports["xsound"].PlayUrl("seatbeltOff", Sounds.SeatbeltOff, 0.3, false);
        }
      }
    }
  }

  private updateState(newState: boolean): void {
    this.seatbeltToggled = newState;
    this.client.playerStates.state.set("seatbelt", newState, true);
  }

  private async ejectPassengers(vehicle: Vehicle): Promise<void> {
    if (vehicle.exists()) {
      const passengers = await getVehPassengers(vehicle);
      emitNet(Events.ejectPassengers, passengers, vehicle.Velocity);
    }
  }

  private async harmPassengers(vehicle: Vehicle): Promise<void> {
    if (vehicle.exists()) {
      const passengers = await getVehPassengers(vehicle);
      emitNet(Events.harmPassengers, passengers);
    }
  }

  public start(): void {
    this.updateState(false); // Set our seatbelt to off

    if (this.tick === undefined) this.tick = setTick(async() => {
      const myPed = Game.PlayerPed;

      // If we're inside a vehicle
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;

        // If we aren't driving any kind of bike (something that doesn't have a belt)
        if (!currVeh.Model.IsBike && !currVeh.Model.IsQuadbike && !currVeh.Model.IsBicycle) {
          const driver = GetPedInVehicleSeat(currVeh.Handle, VehicleSeat.Driver);
          if (driver > 0) {
            if (driver == myPed.Handle) {
              // console.log("is car!");
              // If our last vehicle is different, re-define it
              if (this.lastVehicle === undefined || this.lastVehicle !== currVeh) {
                this.lastVehicle = currVeh;
              }

              if (currVeh.EngineHealth < 0.0) {
                currVeh.EngineHealth = 0.0;
              }

              this.currBodyHealth = currVeh.BodyHealth;

              // If our vehicle doesn't have any damage, reset the frame difference
              if (this.currBodyHealth == 1000 && this.frameDiff !== 0) {
                this.frameDiff = 0;
              }

              if (this.frameDiff !== 0) {
                // console.log("THREE", this.frameDiff, this.oldFrameSpeed, this.oldFrameSpeed * 0.75, this.damaged);
                if (this.oldFrameSpeed > 100 && this.frameDiff < (this.oldFrameSpeed * 0.75) && !this.damaged) {
                  if (this.frameDiff > 18.0) { //If vehicle has less damage basically (if it is faster)
                    console.log("SEATBELT ONE!", this.oldFrameSpeed);

                    if (!this.seatbeltToggled) {
                      if (Math.ceil(this.oldFrameSpeed) > 100) {
                        console.log("SEATBELT EJECT 1!");
                        await this.ejectPassengers(currVeh);
                      }
                    } else {
                      if (Math.ceil(this.oldFrameSpeed) > 80) {
                        console.log("HARM PASSENGERS 1!");
                        await this.harmPassengers(currVeh);
                      }
                    }
                  } else {
                    console.log("SEATBELT TWO!");

                    if (!this.seatbeltToggled) {
                      if (Math.ceil(this.oldFrameSpeed) > 80) {
                        console.log("SEATBELT EJECT 2!");
                        await this.ejectPassengers(currVeh);
                      }
                    } else {
                      if (Math.ceil(this.oldFrameSpeed) > 60) {
                        console.log("HARM PASSENGERS 2!");
                        await this.harmPassengers(currVeh);
                      }
                    }
                  }

                  this.damaged = true;
                  console.log("DAMAGE VEH 1");
                  currVeh.EngineHealth = 0.0;
                  currVeh.IsEngineRunning = false;
                  await Delay(1000);
                  // do chance server LEO dispatch notification
                }

                if (this.currBodyHealth < 550.0 && !this.damaged) {
                  this.damaged = true;
                  console.log("DAMAGE VEH 2");
                  currVeh.BodyHealth = 945.0;
                  currVeh.EngineHealth = 0.0;
                  currVeh.IsEngineRunning = false;
                  await Delay(1000);
                }
              }

              this.frameDiff = this.newBodyHealth - this.currBodyHealth;
              if (this.ticks > 0) {
                this.ticks = this.ticks - 1;

                if (this.ticks === 1) {
                  this.oldFrameSpeed = speedToMph(currVeh.Speed);
                }
              } else {
                if (this.damaged) {
                  this.damaged = false;
                  this.frameDiff = 0;
                  this.oldFrameSpeed = speedToMph(currVeh.Speed);
                }

                this.newFrameSpeed = speedToMph(currVeh.Speed);
                if (this.newFrameSpeed > this.oldFrameSpeed) {
                  this.oldFrameSpeed = speedToMph(currVeh.Speed);
                }

                if (this.newFrameSpeed < this.oldFrameSpeed) {
                  this.ticks = 25;
                }

                this.newBodyHealth = currVeh.BodyHealth;
              }

              this.vehVelocity = currVeh.Velocity;
            } else {
              if (this.lastVehicle !== undefined) {
                if (this.lastVehicle.Handle > 0) {
                  await Delay(200);
                  this.newBodyHealth = this.lastVehicle.BodyHealth;
                  if (!this.damaged && this.newBodyHealth < this.currBodyHealth) {
                    console.log("DAMAGE VEH 3");
                    this.damaged = true;
                    this.lastVehicle.EngineHealth = 0.0;
                    this.lastVehicle.IsEngineRunning = false;
                    await Delay(1000);
                  }

                  this.lastVehicle = undefined;
                }
              }

              this.oldFrameSpeed = 0;
              this.newFrameSpeed = 0;
              this.newBodyHealth = 0;
              this.currBodyHealth = 0;
              this.frameDiff = 0;

              await Delay(1000);
            }
          } else {
            await Delay(1000);
          }
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

      if (this.seatbeltToggled) {
        this.updateState(false);
        global.exports["xsound"].PlayUrl("seatbeltOff", Sounds.SeatbeltOff, 0.3, false); // Do seatbelt off sound, when u exit vehicle
      }
      
      this.ticks = 0;
      this.oldFrameSpeed = 0;
      this.newFrameSpeed = 0;
      this.currBodyHealth = 0;
      this.currEngineHealth = 0;
      this.newBodyHealth = 0;
      this.newEngineHealth = 0;
      this.frameDiff = 0;
      this.vehVelocity = undefined;
      this.damaged = false;
      this.lastVehicle = undefined;;
    }
  }

  // Events
  private async EVENT_ejectFromVeh(vehicleVelocity: Vector3): Promise<void> {
    Inform("EJECTOR", "EJECT OUR PUSSY ASSES FROM THE VEHICLE!");
    console.log("EJECT VELOCITY IS THIS FKIN FAST", vehicleVelocity);
    const myPed = Game.PlayerPed;
    if (IsPedInAnyVehicle(myPed.Handle, false)) {

      // Fade out the screen
      DoScreenFadeOut(0);

      // Eject from the vehicle
      const currVeh = myPed.CurrentVehicle;
      myPed.Position = NumToVector3(GetWorldPositionOfEntityBone(currVeh.Handle, GetEntityBoneIndexByName(currVeh.Handle, "windscreen")));
      myPed.Velocity = new Vector3(vehicleVelocity.x * 4, vehicleVelocity.y * 4, vehicleVelocity.z * 4);

      // Wait 1.5 seconds, then fade back in over 3 seconds.
      await Delay(1500);
      DoScreenFadeIn(3000);
    }
  }
  
  private async EVENT_harmPassenger(): Promise<void> {
    Inform("HARMED", "HARM OUR PUSSY ASSES IN THE VEHICLE!");
    const myPed = Game.PlayerPed;
    myPed.Health = (Math.ceil(myPed.MaxHealth / 2));
    SetTimecycleModifier("damage");
    const notify = new Notification("Vehicle", "You've received damage from the impact of the vehicle crash!", NotificationTypes.Info);
    await notify.send();

    setTimeout(() => {
      ClearTimecycleModifier();
      ClearExtraTimecycleModifier();
    }, 2000);
  }
}
