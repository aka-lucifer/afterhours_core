import { Control, Game, InputMode, Screen } from "fivem-js";

import { Client } from "../../client";
import {Delay, GetHash, Inform} from "../../utils";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";

import clientConfig from "../../../configs/client.json";
import sharedConfig from "../../../configs/shared.json";

export class SpamPreventor {
  private client: Client;
  private currentWeapon: number;
  private holdCount: number = 0;
  private holdMaxCount: number = clientConfig.controllers.weapons.spamPreventor.holdCount;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(LXEvents.Gunshot_Cl, this.gunshot.bind(this));
    
    Inform("Weapon | SpamPreventor Controller", "Started!");
  }
  
  // Events
  private async gunshot(): Promise<void> {
    this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

    // if we aren't unarmed
    if (this.currentWeapon != Weapons.Unarmed) {
      // If our gun shoots bullets
      if (GetWeaponDamageType(this.currentWeapon) == 3) {
        const weaponData = sharedConfig.weapons[this.currentWeapon];
        if (weaponData !== undefined) {
          const weaponIndex = clientConfig.controllers.weapons.spamPreventor.weaponWhitelist.findIndex(weapon => GetHash(weapon) == this.currentWeapon);

          // If the current weapon doesn't exist in the whitelist, run the preventor
          if (weaponIndex === -1) {
            if (weaponData.ammoType == "AMMO_PISTOL" || weaponData.ammoType == "AMMO_SHOTGUN" || weaponData.ammoType == "AMMO_SNIPER") {
              while (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Attack) || Game.isDisabledControlPressed(InputMode.MouseAndKeyboard, Control.Attack)) {
                await Delay(10);
                if (this.holdCount < this.holdMaxCount) {
                  this.holdCount++;
                } else {
                  Screen.displayHelpTextThisFrame("~r~Release the trigger to fire again!");
                }

                DisablePlayerFiring(Game.Player.Handle, true);
                // console.log("still holding fire button!");
              }

              this.holdCount = 0;
              // console.log("released trigger")
            }
          }
        }
      }
    }
  }
}
