import { AmmoType, Control, Game, InputMode, Screen } from "fivem-js";

import { randomBetween, LoadAnim, PlayAnim } from "../../utils";

import { Notification } from "../../models/ui/notification";
import { Progress } from "../../models/ui/progress";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";

import clientConfig from "../../../configs/client.json";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class WeaponJamming {
  private jammedWeapons: number[] = [];
  private jamTick: number = undefined;
  private unjammingWeapon: boolean = false;

  constructor() {
    // Events
    onNet(LXEvents.Gunshot_Cl, this.EVENT_gunshot.bind(this));
  }

  // Events
  private async EVENT_gunshot(): Promise<void> {
    let currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
    const jammedIndex = this.jammedWeapons.findIndex(weapon => weapon == currWeapon);

    if (jammedIndex === -1) {
      if (currWeapon !== Weapons.Unarmed) {
        // Shoots bullets
        if (GetWeaponDamageType(currWeapon) == 3) {
          const jamChance = randomBetween(1, 100);
          if (jamChance <= clientConfig.controllers.weapons.jamming.blockPercentage) {
            this.jammedWeapons.push(currWeapon);
            const notify = new Notification("Weapon", "Your weapon has jammed!", NotificationTypes.Info);
            await notify.send();

            if (this.jamTick == undefined) this.jamTick = setTick(async() => {
              currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
              const jammedIndex = this.jammedWeapons.findIndex(weapon => weapon == currWeapon);

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
                  Screen.displayHelpTextThisFrame("~INPUT_DETONATE~ Unjam Weapon");
                  if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Detonate)) {
                    this.unjammingWeapon = true;

                    const currAmmoType = GetPedAmmoTypeFromWeapon(Game.PlayerPed.Handle, currWeapon);
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
                    }, async() => {
                      const loadedAnim = await LoadAnim(unjamDict);
                      if (loadedAnim) {
                        PlayAnim(Game.PlayerPed, unjamDict, "reload_low_left", 49, unjamLength, 8.0, -8.0, 0.0, false, false, false);
                      }
                    }, async() => {
                      StopAnimTask(Game.PlayerPed.Handle, unjamDict, "reload_low_left", 1.0);
                      MakePedReload(Game.PlayerPed.Handle);
                      this.jammedWeapons.splice(jammedIndex, 1);

                      if (this.jammedWeapons.length <= 0) {
                        if (this.jamTick !== undefined) {
                          clearTick(this.jamTick);
                          this.jamTick = undefined;
                          this.unjammingWeapon = false;
                        }
                      }
                      const notify = new Notification("Weapon", "You unjammed your weapon!", NotificationTypes.Info);
                      await notify.send();
                    })

                    progress.start();
                  }
                }
              }
            });
          }
        }
      }
    }
  }
}