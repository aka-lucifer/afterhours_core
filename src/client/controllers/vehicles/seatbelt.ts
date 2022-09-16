import { Control, Entity, Game, InputMode, Vector3, Vehicle, VehicleSeat } from 'fivem-js';

import { Client } from '../../client';
import { Delay, getVehPassengers, Inform, randomBetween, speedToMph } from '../../utils';

import { Notification } from '../../models/ui/notification';

import { Events } from '../../../shared/enums/events/events';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { Sounds } from '../../../shared/enums/sounds';
import { NumToVector3 } from '../../../shared/utils';

export class Seatbelt {
  private client: Client;
  private seatbeltToggled: boolean = false;

  private velocitySpeed: number;
  private speed: number;
  private velocity: Vector3;
  
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

  private async ejectPassengers(vehicle: Vehicle, velocity: Vector3): Promise<void> {
    if (vehicle.exists()) {
      const passengers = await getVehPassengers(vehicle);
      emitNet(Events.ejectPassengers, passengers, velocity);
    }
  }

  private async harmPassengers(vehicle: Vehicle): Promise<void> {
    if (vehicle.exists()) {
      const passengers = await getVehPassengers(vehicle);
      emitNet(Events.harmPassengers, passengers);
    }
  }

  private async fmv(entity: Entity): Promise<Record<string, any>> {
    let heading = entity.Heading;
    if (heading < 0.0) heading = 360.0 + heading;
    heading = heading * 0.0174533;
    return {
      x: Math.cos(heading) * 2.0,
      y: Math.sin(heading) * 2.0
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
              this.velocitySpeed = this.speed;
              this.speed = currVeh.Speed;

              if (this.velocitySpeed !== undefined
                && GetEntitySpeedVector(currVeh.Handle, true)[1] > 1.0
                && this.speed > 19.25
                && (this.velocitySpeed - this.speed) > (this.speed * 0.255)) {
                  if (!this.seatbeltToggled) {
                    await this.ejectPassengers(currVeh, this.velocity);
                  } else {
                    await this.harmPassengers(currVeh)
                  }
                }

                this.velocity = currVeh.Velocity;
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
      const newPos = NumToVector3(GetWorldPositionOfEntityBone(currVeh.Handle, GetEntityBoneIndexByName(currVeh.Handle, "windscreen")));
      const fw = await this.fmv(myPed);
      myPed.Position = new Vector3(newPos.x + fw.x, newPos.y + fw.y, newPos.z - 0.47);

      // Eject us from the vehicle at the vehicles current velocity
      SetEntityVelocity(Game.PlayerPed.Handle, vehicleVelocity.x, vehicleVelocity.y, vehicleVelocity.z);

      // Wait and then ragdoll
      await Delay(100);
      myPed.ragdoll(1000, 0);

      // Damage our ped
      const ejectSpeed = Math.ceil(vehicleVelocity.y * 8);
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
