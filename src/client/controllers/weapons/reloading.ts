import { Audio, Control, Game, Screen } from "fivem-js";

import { Delay, GetHash, Inform } from "../../utils";
import { Client } from "../../client";

import { Notification } from "../../models/ui/notification";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

import clientConfig from "../../../configs/client.json";

export class Reloading {
  private client: Client;
  private currentWeapon: number;
  private currentAmmo: number;
  private reloadWeapons: number[] = [];
  private reloadingWeapon: boolean = false;
  private notifyTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(LXEvents.Gunshot_Cl, this.EVENT_gunshot.bind(this));

    // Key Bindings
    RegisterCommand("+reload_weapon", this.reloadWeapon.bind(this), false);
    
    Inform("Weapon | Recoil Controller", "Started!");
  }

  // Methods
  private async reloadWeapon(): Promise<void> {
    // console.log("reload gun!");
    if (this.currentWeapon != Weapons.Unarmed) {
      const reloadIndex = this.reloadWeapons.findIndex(weapon => weapon == this.currentWeapon);

      // console.log("reload index", reloadIndex);
      // If your current weapon requires reloading
      if (reloadIndex !== -1) {
        // If your weapon shoots bullets
        if (GetWeaponDamageType(this.currentWeapon) == 3) {
          // console.log("shoots bullets")
          // console.log("ammoCount", this.currentAmmo, this.currentWeapon, GetHash("WEAPON_SNSPISTOL"));
          // If your weapon needs reloading
          if (this.currentAmmo <= 1) {
            // If you aren't reloading your weapon
            // console.log("reloading", this.reloadingWeapon);
            if (!this.reloadingWeapon) {
              this.reloadingWeapon = true;
              const myPed = Game.PlayerPed;

              // console.log("make reload, index", reloadIndex, myPed.Handle);
              TaskReloadWeapon(myPed.Handle, false);
              // MakePedReload(myPed.Handle);
              DisablePlayerFiring(Game.Player.Handle, false);
              this.reloadWeapons.splice(reloadIndex, 1);

              if (this.reloadWeapons.length <= 0) {
                if (this.notifyTick !== undefined) {
                  clearTick(this.notifyTick);
                  this.notifyTick = undefined;
                }
              }
              this.reloadingWeapon = false;

              const notify = new Notification("Weapon", "You reloaded your weapon!", NotificationTypes.Info);
              await notify.send();
            }
          }
        }
      }
    }
  }

  // Events
  private EVENT_gunshot(): void {
    // Inform("LX Event (Gunshot)", "You've fired your weapon");
    const myPed = Game.PlayerPed;
    this.currentWeapon = GetSelectedPedWeapon(myPed.Handle);
    if (this.currentWeapon != Weapons.Unarmed) {
      const reloadIndex = this.reloadWeapons.findIndex(weapon => weapon == this.currentWeapon);
    
      // If weapon doesn't need to be reloaded, run below
      if (reloadIndex === -1) {
        const weaponIndex = clientConfig.controllers.weapons.manualReload.weaponWhitelist.findIndex(weapon => GetHash(weapon) == this.currentWeapon);

        // If the current weapon doesn't exist in the whitelist, run the reloader, otherwise don't make them manually reload
        if (weaponIndex === -1) {

          // If current weapon shoots bullets
          if (GetWeaponDamageType(this.currentWeapon) == 3) {
            // Get the weapons magazine ammo
            const [someBool, ammoCount] = GetAmmoInClip(myPed.Handle, this.currentWeapon);
            this.currentAmmo = ammoCount;
            // if first bullet

            if (this.currentAmmo <= 1) {
              this.reloadWeapons.push(this.currentWeapon);

              if (this.notifyTick == undefined) this.notifyTick = setTick(async() => {
                this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
                this.currentAmmo = ammoCount;

                const reloadIndex = this.reloadWeapons.findIndex(weapon => weapon == this.currentWeapon);

                // If your current weapon requires reloading
                if (reloadIndex !== -1) {
                  DisableControlAction(0, Control.Reload, true);
                  DisableControlAction(0, Control.MeleeAttackLight, true);
                  DisableControlAction(0, Control.MeleeAttackHeavy, true);
                  DisableControlAction(0, Control.MeleeAttackAlternate, true);
                  DisablePlayerFiring(Game.Player.Handle, true);
                  
                  if (Game.isControlJustPressed(0, Control.Attack) || Game.isDisabledControlJustPressed(0, Control.Attack)) {
                    // console.log("ammo count", someBool, this.currentAmmo);
                    PlaySoundFrontend(-1, "Place_Prop_Fail", "DLC_Dmod_Prop_Editor_Sounds", false);
                    Screen.showSubtitle("~r~Reload your weapon!");
                  }

                  if (!this.reloadingWeapon) {
                    Screen.displayHelpTextThisFrame("~y~Reload your weapon!");
                  }
                } else {
                  await Delay(500);
                }
              });
            }
          }
        }
      }
    }
  }
}