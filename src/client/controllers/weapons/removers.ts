import { Game } from "fivem-js";

import { Client } from "../../client";
import { Delay, Inform, LoadAnim, PlayAnim } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { Weapons } from "../../../shared/enums/weapons";

import clientConfig from "../../../configs/client.json";
import sharedConfig from "../../../configs/shared.json";

export class WeaponRemovers {
  private client: Client;

  private currentWeapon: number;
  private changedWeapon: boolean = false;
  private rollArmed: boolean = false;
  private changeTick: number;

  constructor(client: Client) {
    this.client = client;
    
    Inform("Weapon | Removers Controller", "Started!");
  }

  // Methods
  private async rollWeapon(): Promise<boolean> {
    const damageTypes = clientConfig.controllers.weapons.disablers.antiRolling.damageTypes;
    for (let i = 0; i < damageTypes.length; i++) {
      if (damageTypes[i] == GetWeaponDamageType(this.currentWeapon)) {
        return true;
      }
    }

    return false;
  }

  public start(): void {
    // console.log("start tick!");
    if (this.changeTick === undefined) this.changeTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      
      if (this.currentWeapon === undefined) { // If our current weapon is unassigned
        const [wep, currWeapon] = GetCurrentPedWeapon(myPed.Handle, true);
        this.currentWeapon = currWeapon;
      } else { // If it is assigned check if it's different
        const [wep, currWeapon] = GetCurrentPedWeapon(myPed.Handle, true);
        if (currWeapon !== this.currentWeapon) {
          // console.log("changed weapon!");
          // console.log("diff weapon!")
          this.currentWeapon = currWeapon; // Set new weapon
          this.rollArmed = await this.rollWeapon();
          this.changedWeapon = true; // Set changed our weapon to true
        }
      }

      if (this.changedWeapon) {
        // console.log("mandem changed his weapon init bruv!");
        emitNet(Events.checkWeapon, this.currentWeapon);
        this.changedWeapon = false;

        // [WEAPON IN VEHICLE]
        await this.client.vehicleManager.weapon.changedWeapon(this.currentWeapon);
        
        // [ANTI COMBAT ROLE | ANTI PUNCH SPAMMING]
        // If the weapon is a roll weapon
        if (this.rollArmed) {
          // If the combat roll disabler tick isn't running, and we're armed with a roll weapon, start it
          if (!this.client.weaponManager.disablers.RollActive) {
            await Delay(200); // Wait 0.2 seconds as we may not have access to this weapon, due to our rank

            // If the weapon is still on our ped
            if (GetSelectedPedWeapon(myPed.Handle) !== Weapons.Unarmed) {
              this.client.weaponManager.disablers.startRoll();
            }
          }

          if (this.client.weaponManager.disablers.PunchActive) {
            this.client.weaponManager.disablers.stopPunch();
          }

          if (!this.client.staffManager.staffMenu.WeaponActive) {
            this.client.staffManager.staffMenu.startWeapon();
          }
        } else {
          // If the combat roll disabler tick is running
          if (this.client.weaponManager.disablers.RollActive) {
            this.client.weaponManager.disablers.stopRoll();
          }

          if (!this.client.weaponManager.disablers.PunchActive) {
            this.client.weaponManager.disablers.startPunch();
          }
          
          if (this.client.staffManager.staffMenu.WeaponActive) {
            this.client.staffManager.staffMenu.stopWeapon();
          }
        }

        // [CHANGE WEAPON IN VEH ANIM]
        if (IsPedInAnyVehicle(myPed.Handle, false)) {
          const currVeh = myPed.CurrentVehicle;
          // // If not a bike or anything that uses persistent anims
          if (currVeh.Model.IsCar || currVeh.Model.IsBoat|| currVeh.Model.IsCargobob|| currVeh.Model.IsHelicopter|| currVeh.Model.IsPlane) {
            const loadedAnim = LoadAnim("reaction@intimidation@1h");
            if (loadedAnim) {
              const param = this.currentWeapon !== Weapons.Unarmed ? "intro" : "outro";
              const animLength = (GetAnimDuration("reaction@intimidation@1h", param) * 1000) - 2500;
              const playing = PlayAnim(myPed, "reaction@intimidation@1h", param, 50, animLength, 1.0, 1.0, -1, false, false, false);
              if (playing) {
                await Delay(animLength);
                ClearPedTasks(myPed.Handle);
              }
            }
          }
        }
      }

      await Delay(500);
    });


  }

  public stop(): void {
    if (this.changeTick !== undefined) {
      clearTick(this.changeTick);
      this.changeTick = undefined;
    }
  }
}
