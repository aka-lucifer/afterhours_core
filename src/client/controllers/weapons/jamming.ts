import { AmmoType, Control, Game, InputMode, Screen } from "fivem-js";

import { Client } from "../../client";
import { randomBetween, LoadAnim, PlayAnim, Inform, GetHash, Error } from "../../utils";

import { Notification } from "../../models/ui/notification";
import { Progress } from "../../models/ui/progress";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Weapon } from "../../../shared/interfaces/weapon";

import clientConfig from "../../../configs/client.json";
import sharedConfig from "../../../configs/shared.json";

export class WeaponJamming {
  private client: Client;

  private weapon: number;
  private jammedWeapons: number[] = [];

  private jamTick: number = undefined;

  private unjammingWeapon: boolean = false;
  private jamAttempted: boolean = false;

  constructor(client: Client) {
    this.client = client;

    // Key Mapping
    RegisterCommand("+unjam_weapon", this.unjamWeapon.bind(this), false);

    // Events
    onNet(LXEvents.Gunshot_Cl, this.EVENT_gunshot.bind(this));
    
    Inform("Weapon | Jamming Controller", "Started!");
  }

  // Methods
  private unjamWeapon(): void {
    if (this.weapon !== Weapons.Unarmed) {
      const jammedIndex = this.jammedWeapons.findIndex(weapon => weapon == this.weapon);
  
      if (jammedIndex !== -1) {
        // Shoots bullets
        if (GetWeaponDamageType(this.weapon) == 3) {
          if (!this.unjammingWeapon) {
            this.unjammingWeapon = true;

            const currAmmoType = GetPedAmmoTypeFromWeapon(Game.PlayerPed.Handle, this.weapon);
            let unjamLength;
            let unjamDict;

            switch(currAmmoType) {
              case AmmoType.Pistol:
                unjamLength = 10000;
                unjamDict = "anim@cover@weapon@reloads@pistol@flare";
                break;
              case AmmoType.SMG:
                unjamLength = 15000;
                unjamDict = "anim@cover@weapon@machinegun@gusenberg_str";
                break;
              case AmmoType.AssaultRifle:
                unjamLength = 20000;
                unjamDict = "anim@cover@weapon@reloads@rifle@spcarbine";
                break;
              case AmmoType.Shotgun:
                unjamLength = 20000;
                unjamDict = "anim@cover@weapon@reloads@rifle@dbshot";
                break;
              case AmmoType.Sniper:
                unjamLength = 25000;
                unjamDict = "cover@weapon@reloads@rifle@sniper_rifle";
                break;
            }

            const progress = new Progress(unjamLength, {
              combat: true
            }, async() => {
              ClearPedTasks(Game.PlayerPed.Handle);
              this.unjammingWeapon = false;
              const notify = new Notification("Weapon", "You stopped unjamming your weapon!", NotificationTypes.Error);
              await notify.send();
              this.client.richPresence.Status = undefined;
            }, async() => {
              const loadedAnim = await LoadAnim(unjamDict);
              if (loadedAnim) {
                const weaponData: Weapon = sharedConfig.weapons[this.weapon];
  
                if (weaponData !== undefined) {
                  if (weaponData.type == "weapon") {
                    this.client.richPresence.Status = `Unjamming ${weaponData.label}`;
                    PlayAnim(Game.PlayerPed, unjamDict, "reload_low_left", 49, unjamLength, 8.0, -8.0, 0.0, false, false, false);
                  } else {
                    progress.cancel();
                    Error("Weapons | Unjam Controller", "Weapon not found, report this via a development support ticket on the forums!");
                  }
                } else {
                  progress.cancel();
                  Error("Weapons | Unjam Controller", "Weapon not found, report this via a development support ticket on the forums!");
                }
              }
            }, async() => {
              StopAnimTask(Game.PlayerPed.Handle, unjamDict, "reload_low_left", 1.0);
              MakePedReload(Game.PlayerPed.Handle);
              this.jammedWeapons.splice(jammedIndex, 1);

              if (this.jammedWeapons.length <= 0) {
                if (this.jamTick !== undefined) {
                  clearTick(this.jamTick);
                  this.jamTick = undefined;
                }
              }
              
              this.unjammingWeapon = false;
              const notify = new Notification("Weapon", "You unjammed your weapon!", NotificationTypes.Info);
              await notify.send();
              this.client.richPresence.Status = undefined;
            })

            progress.start();
          }
        }
      }
    }
  }

  // Events
  private async EVENT_gunshot(): Promise<void> {
    this.weapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
    if (this.weapon !== Weapons.Unarmed) {
      const jammedIndex = this.jammedWeapons.findIndex(weapon => weapon == this.weapon);

      // If weapon isn't jammed, run below
      if (jammedIndex === -1) {
        const weaponIndex = clientConfig.controllers.weapons.jamming.weaponWhitelist.findIndex(weapon => GetHash(weapon) == this.weapon);

        // If the current weapon doesn't exist in the whitelist, run the reloader, otherwise don't run the jam chancer
        if (weaponIndex === -1) {
          if (GetWeaponDamageType(this.weapon) == 3) {
            if (!this.jamAttempted) {
              // console.log("not ran jam attempt");
              this.jamAttempted = true;
              const jamChance = randomBetween(1, 100);
              if (jamChance <= clientConfig.controllers.weapons.jamming.blockPercentage) {
                this.jammedWeapons.push(this.weapon);
                const notify = new Notification("Weapon", "Your weapon has jammed!", NotificationTypes.Info);
                await notify.send();

                if (this.jamTick == undefined) this.jamTick = setTick(async () => {
                  this.weapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
                  const jammedIndex = this.jammedWeapons.findIndex(weapon => weapon == this.weapon);

                  // If your current weapon requires unjamming
                  if (jammedIndex !== -1) {
                    DisablePlayerFiring(Game.Player.Handle, true);
                    Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Attack);
                    Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Aim);
                    Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Reload);
                    Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttackAlternate);
                    Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Attack2);

                    if (Game.isControlJustPressed(0, Control.Attack) || Game.isDisabledControlJustPressed(0, Control.Attack)) {
                      PlaySoundFrontend(-1, "Place_Prop_Fail", "DLC_Dmod_Prop_Editor_Sounds", false);
                      Screen.showSubtitle("~r~Weapon Jammed", 2000);
                    }

                    if (!this.unjammingWeapon) {
                      Screen.displayHelpTextThisFrame("~y~Unjam your weapon");
                    }
                  }
                });
              }

              setTimeout(() => {
                // console.log("set jam attempted back to false")
                this.jamAttempted = false;
              }, clientConfig.controllers.weapons.jamming.timeBetween);
            }
            // else {
            //   console.log("can't run jam attempt until 20 second timeout is finished!");
            // }
          }
        }
      }
    }
  }
}
