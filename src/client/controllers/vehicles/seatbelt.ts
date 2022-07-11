import { Game, Vector3, Vehicle, VehicleSeat } from 'fivem-js';

import { Client } from '../../client';
import { Delay, getVehPassengers, Inform, NumToVector3, randomBetween, speedToMph } from '../../utils';

import { Notification } from '../../models/ui/notification';

import { Events } from '../../../shared/enums/events/events';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { Sounds } from '../../../shared/enums/sounds';

export class Seatbelt {
  private client: Client;
  private seatbeltToggled: boolean = false;

  private ticks: number = 0;
  private lastFrameSpeed: number = 0;
  private lastFrameSpeed2: number = 0;
  private frameSpeed: number = 0;
  
  private currBodyHealth: number = 0;
  private currEngineHealth: number = 0;
  private newBodyHealth: number = 0;
  private newEngineHealth: number = 0;

  private frameBodyChange: number = 0;
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

          // global.exports["xsound"].PlayUrl("seatbeltOn", Sounds.SeatbeltOn, 0.3, false);
        } else {
          console.log("remove seatbelt & stop sound");

          const notify = new Notification("Seatbelt", "You've removed your seatbelt", NotificationTypes.Error);
          await notify.send();
          // global.exports["xsound"].PlayUrl("seatbeltOff", Sounds.SeatbeltOff, 0.3, false);
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
              if (currVeh.EngineHealth < 0.0) {
                currVeh.EngineHealth = 0.0;
              }

              this.frameSpeed = currVeh.Speed * 3.6;
              this.currBodyHealth = currVeh.BodyHealth;

              if (this.currBodyHealth === 1000 && this.frameBodyChange !== 0) {
                this.frameBodyChange = 0;
              }

              if (this.frameBodyChange !== 0) {
                if (this.lastFrameSpeed > 100 && this.frameSpeed < (this.lastFrameSpeed * 0.75) && !this.damaged) {
                  // console.log("frame change", this.frameBodyChange);
                  if (this.frameBodyChange > 18.0) {
                    if (!this.seatbeltToggled) {
                      if (Math.ceil(this.lastFrameSpeed) > 110) {
                        // console.log("EJECT 1!");
                        await this.ejectPassengers(currVeh);
                      }
                    } else {
                      if (this.lastFrameSpeed > 150) {
                        if (Math.ceil(this.lastFrameSpeed) > 99) {
                          // console.log("DAMAGE 1!");
                          await this.harmPassengers(currVeh);
                        }
                      }
                    }
                  } else {
                    if (!this.seatbeltToggled) {
                      if (randomBetween(1, Math.ceil(this.lastFrameSpeed)) > 60) {
                        // console.log("EJECT 2!");
                        await this.ejectPassengers(currVeh);
                      }
                    } else {
                      if (this.lastFrameSpeed > 120) {
                        if (randomBetween(1, Math.ceil(this.lastFrameSpeed)) > 99) {
                          // console.log("DAMAGE 2!");
                          await this.harmPassengers(currVeh);
                        }
                      }
                    }
                  }

                  this.damaged = true;
                  currVeh.EngineHealth = 0;
                  currVeh.IsEngineRunning = false;
                  // console.log("DISABLE 1!");
                  await Delay(1000);
                }

                if (this.currBodyHealth < 550.0 && !this.damaged) {
                  this.damaged = true;
                  currVeh.BodyHealth = 945.0;
                  currVeh.EngineHealth = 0;
                  currVeh.IsEngineRunning = false;
                  // console.log("DISABLE 2!");
                  await Delay(1000);
                }
              }

              this.frameBodyChange = this.newBodyHealth - this.currBodyHealth;

              if (this.ticks > 0) {
                this.ticks = this.ticks - 1;
                if (this.ticks == 1) {
                  this.lastFrameSpeed = currVeh.Speed * 3.6;
                }
              } else {
                if (this.damaged) {
                  this.damaged = false;
                  this.frameBodyChange = 0;
                  this.lastFrameSpeed = currVeh.Speed * 3.6;
                }

                this.lastFrameSpeed2 = currVeh.Speed * 3.6;
                if (this.lastFrameSpeed2 > this.lastFrameSpeed) {
                  this.lastFrameSpeed = currVeh.Speed * 3.6;
                }

                if (this.lastFrameSpeed2 < this.lastFrameSpeed) {
                  this.ticks = 25;
                }
              }
              
              this.vehVelocity = currVeh.Velocity;
              if (this.ticks < 0) {
                this.ticks = 0;
              }

              this.newBodyHealth = currVeh.BodyHealth;
            } else {
              this.vehVelocity = currVeh.Velocity;
              
              if (this.lastVehicle !== undefined) {
                if (this.lastVehicle.Handle > 0) {
                  await Delay(200);
                  this.newBodyHealth = this.lastVehicle.BodyHealth;
                  if (!this.damaged && this.newBodyHealth < this.currBodyHealth) {
                    // console.log("DAMAGE VEH 3");
                    this.damaged = true;
                    this.lastVehicle.EngineHealth = 0.0;
                    this.lastVehicle.IsEngineRunning = false;
                    await Delay(1000);
                  }

                  this.lastVehicle = undefined;
                }
              }

              // this.lastFrameSpeed = 0;
              // this.lastFrameSpeed2 = 0;
              // this.frameSpeed = 0;
              // this.newBodyHealth = 0;
              // this.currBodyHealth = 0;
              // this.frameBodyChange = 0;

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
        // global.exports["xsound"].PlayUrl("seatbeltOff", Sounds.SeatbeltOff, 0.3, false); // Do seatbelt off sound, when u exit vehicle
      }
      
      this.ticks = 0;
      this.lastFrameSpeed = 0;
      this.lastFrameSpeed2 = 0;
      this.frameSpeed = 0;
      this.currBodyHealth = 0;
      this.currEngineHealth = 0;
      this.newBodyHealth = 0;
      this.newEngineHealth = 0;
      this.frameBodyChange = 0;
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
      this.client.death.ejectedFromVeh = true;

      // Fade out the screen
      DoScreenFadeOut(0);

      // Eject from the vehicle
      const currVeh = myPed.CurrentVehicle;

      // Teleport to vehicle windshield (so we aren't stuck under the vehicle)
      myPed.Position = NumToVector3(GetWorldPositionOfEntityBone(currVeh.Handle, GetEntityBoneIndexByName(currVeh.Handle, "windscreen")));
      await Delay(1);

      // Ragdoll and ejection speed
      SetPedToRagdoll(myPed.Handle, 5511, 511, 0, false, false, false);
      myPed.Velocity = new Vector3(vehicleVelocity.x * 4, vehicleVelocity.y * 4, vehicleVelocity.z * 4);
      
      const ejectSpeed = Math.ceil(currVeh.Speed * 8);
      SetEntityHealth(myPed.Handle, (GetEntityHealth(myPed.Handle) - ejectSpeed))

      // Wait 1.5 seconds, then fade back in over 3 seconds.
      await Delay(1000);
      DoScreenFadeIn(500);
      this.client.death.ejectedFromVeh = false;
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
