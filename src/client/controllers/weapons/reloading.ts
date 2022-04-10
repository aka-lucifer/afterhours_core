import { Audio, Control, Game, Screen } from "fivem-js";

import { GetHash, Inform } from "../../utils";
import { Client } from "../../client";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";
import clientConfig from "../../../configs/client.json";

export class Reloading {
  private client: Client;
  private currentWeapon: number;
  private ammoCount: number;
  private notifyTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(LXEvents.Gunshot_Cl, this.EVENT_gunshot.bind(this));

    // Key Bindings
    RegisterCommand("+reload_weapon", this.reloadWeapon.bind(this), false);
  }

  // Methods
  private reloadWeapon(): void {
    if (this.currentWeapon != Weapons.Unarmed) {
      if (this.ammoCount <= 1) {
        clearTick(this.notifyTick);
        this.notifyTick = undefined;
        MakePedReload(Game.PlayerPed.Handle);
        DisablePlayerFiring(Game.Player.Handle, false);
      }
    }
  }

  // Events
  private EVENT_gunshot(): void {
    // Inform("LX Event (Gunshot)", "You've fired your weapon");
    const myPed = Game.PlayerPed;
    this.currentWeapon = GetSelectedPedWeapon(myPed.Handle);
    if (this.currentWeapon != Weapons.Unarmed) {
      const weaponIndex = clientConfig.controllers.weapons.manualReload.weaponWhitelist.findIndex(weapon => GetHash(weapon) == this.currentWeapon);

      // If the current weapon doesn't exist in the whitelist, run the reloader, otherwise don't make them manually reload
      if (weaponIndex === -1) {

        // If current weapon shoots bullets
        if (GetWeaponDamageType(this.currentWeapon) == 3) {
          // Get the weapons magazine ammo
          const [someBool, ammoCount] = GetAmmoInClip(myPed.Handle, this.currentWeapon);
          this.ammoCount = ammoCount;
          // if first bullet

          if (ammoCount <= 1) {

            if (this.notifyTick == undefined) this.notifyTick = setTick(() => {
              DisableControlAction(0, Control.Reload, true);
              DisablePlayerFiring(Game.Player.Handle, true);
              Screen.displayHelpTextThisFrame("~y~Reload your weapon!");
              
              if (Game.isControlJustPressed(0, Control.Attack) || Game.isDisabledControlJustPressed(0, Control.Attack)) {
                PlaySoundFrontend(-1, "Place_Prop_Fail", "DLC_Dmod_Prop_Editor_Sounds", false);
                Screen.showSubtitle("~r~Reload your weapon!");
              }
            });
          }
        }
      }
    }
  }
}