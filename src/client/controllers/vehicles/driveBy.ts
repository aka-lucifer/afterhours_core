import { Game, VehicleSeat } from 'fivem-js';

import { Client } from '../../client';
import { Delay, Inform, speedToMph } from '../../utils';

import { Ranks } from '../../../shared/enums/ranks';
import { Weapons } from '../../../shared/enums/weapons';

export class DriveBy {
  private client: Client;

  private canDriveBy: boolean = true;
  private tick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Vehicle | DriveBy Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.tick !== undefined;
  }

  public get Can(): boolean {
    return this.canDriveBy;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      const myPed = Game.PlayerPed;
      const currWeapon = GetSelectedPedWeapon(myPed.Handle);

      if (currWeapon !== Weapons.Unarmed) {
        if (IsPedInAnyVehicle(myPed.Handle, false)) {
          const currVeh = myPed.CurrentVehicle;
          if (currVeh.Driver.Handle === myPed.Handle) {
            const vehSpeed = speedToMph(currVeh.Speed);
            if (vehSpeed > 30) {
              if (this.client.Player.Rank >= Ranks.SeniorAdmin) {
                // console.log("snr admin or above!");
                SetPlayerCanDoDriveBy(Game.Player.Handle, true); // Allow firing as we're senior admin, so we can be trusted
                if (!this.canDriveBy) this.canDriveBy = true;
              } else {
                if (this.client.Character.isLeoJob() && this.client.Character.job.status) {
                  // console.log("on duty LEO!");
                  SetPlayerCanDoDriveBy(Game.Player.Handle, true); // Allow firing as we're on duty LEO
                  if (!this.canDriveBy) this.canDriveBy = true;
                } else {
                  // if (currWeapon !== Weapons.Unarmed) SetCurrentPedWeapon(myPed.Handle, Weapons.Unarmed, true);
                  SetPlayerCanDoDriveBy(Game.Player.Handle, false); // Disable firing
                  if (this.canDriveBy) this.canDriveBy = false;
                }
              }
            } else {
              SetPlayerCanDoDriveBy(Game.Player.Handle, true); // Set this here, so when we go under 30mph, we can fire again
              if (!this.canDriveBy) this.canDriveBy = true;
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        } else {
          await Delay(500);
        }
      } else {
        SetPlayerCanDoDriveBy(Game.Player.Handle, true); // If we're unarmed, enable shooting
        if (!this.canDriveBy) this.canDriveBy = true;
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
}
