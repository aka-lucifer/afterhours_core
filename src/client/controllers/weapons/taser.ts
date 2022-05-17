import { Vector3, Game, Entity, World, MarkerType, Color, Control, Screen } from "fivem-js";

import { Delay, Inform, LoadAnim, PlayAnim, screenToWorld } from "../../utils";

import { Notification } from "../../models/ui/notification";
import { Progress } from "../../models/ui/progress";

import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { LXEvents } from "../../../shared/enums/events/lxEvents";

import clientConfig from "../../../configs/client.json";

export class Taser {
  // Laser Sight
  private laserToggled: boolean = false;
  private laserTick: number = undefined;

  // Taser Effect
  private stunTick: number = undefined;
  private effectTick: number = undefined;
  private appliedEffect: boolean = false;
  
  // Cartridges
  private cartridges: number = 3;
  private maxCartridges: number = clientConfig.controllers.weapons.taser.cartridges.max;
  private reloadingCartridges: boolean = false;
  private cartridgeTick: number = undefined;

  constructor() {
    Inform("Weapon | Taser Controller", "Started!");

    // Events
    onNet(LXEvents.Gunshot_Cl, this.gunshot.bind(this));

    // Keybinds
    RegisterCommand("+toggle_laser", this.toggleLaser.bind(this), false);
    RegisterCommand("+reload_cartridges", this.reloadCartridges.bind(this), false);
  }

  // Methods
  private startEffect(): void {
    if (this.effectTick === undefined) this.effectTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      SetPedMinGroundTimeForStungun(myPed.Handle, 10000);

      if (!this.appliedEffect) {
        this.appliedEffect = true;

        if (!HasAnimSetLoaded("move_m@drunk@moderatedrunk")) {
          RequestAnimSet("move_m@drunk@moderatedrunk") 
          while (!HasAnimSetLoaded("move_m@drunk@moderatedrunk")) {
            await Delay(0);
          }
        }
        
        // Tase Effect
        SetTimecycleModifier("damage");
        SetPedMotionBlur(myPed.Handle, true);
        SetPedMovementClipset(myPed.Handle, "move_m@drunk@moderatedrunk", 1.0);
        SetPedIsDrunk(myPed.Handle, true);
        ShakeGameplayCam("DRUNK_SHAKE", 3.0);
        
        AnimpostfxPlay("DMT_flight_intro", 15000, false);
        await Delay(15000);
        AnimpostfxPlay("Dont_tazeme_bro", 10000, false);
        await Delay(10000);

        // Remove Effect
        this.appliedEffect = false;
        SetPedMotionBlur(myPed.Handle, false);
        ResetPedMovementClipset(myPed.Handle, 1.0);
        SetPedIsDrunk(myPed.Handle, false)
        AnimpostfxStopAll();
        ShakeGameplayCam("DRUNK_SHAKE", 0.0);
        ClearTimecycleModifier();
        ClearExtraTimecycleModifier();
        
        if (this.effectTick !== undefined) {
          console.log("CLEARED EFFECT TICK!");
          clearTick(this.effectTick);
          this.effectTick = undefined;
          this.appliedEffect = false;
        }
      }
    });
  }

  public init(): void {
    if (this.stunTick === undefined) this.stunTick = setTick(async() => {
      const myPed = Game.PlayerPed;
      if (myPed.IsBeingStunned) {
        if (this.effectTick === undefined) this.startEffect();
      } else {
        await Delay(500);
      }
    });
  }

  private async toggleLaser(): Promise<void> {
    let myPed = Game.PlayerPed;
    let currWeapon = GetSelectedPedWeapon(myPed.Handle);
    if (currWeapon == Weapons.X26Tazer) {
      this.laserToggled = !this.laserToggled;

      if (this.laserToggled) {
        const notify = new Notification("Laser Sight", "The laser sight has been toggled!", NotificationTypes.Success);
        await notify.send();

        if (this.laserTick === undefined) this.laserTick = setTick(async() => {
          myPed = Game.PlayerPed;
          if (IsPlayerFreeAiming(Game.Player.Handle)) {
            currWeapon = GetSelectedPedWeapon(myPed.Handle);
            if (currWeapon == Weapons.X26Tazer) {
              const weapon = new Entity(GetCurrentPedWeaponEntityIndex(myPed.Handle));
              const [hit, coords] = screenToWorld(weapon.Position, myPed);

              if (hit) {
                const camMode = GetFollowPedCamViewMode();

                // If camera mode is first person
                if (camMode == 4) {
                  World.drawLine(weapon.Position, coords, Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b));
                  World.drawMarker(MarkerType.DebugSphere, coords, new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector3(0.01, 0.01, 0.01), Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b), false, false, false, null, null, false);
                } else { // If it's third person
                  const newCoords = new Vector3(coords.x, coords.y, coords.z); // Reposition the laser to match the ADS reticle position

                  World.drawLine(weapon.Position, newCoords, Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b));
                  World.drawMarker(MarkerType.DebugSphere, newCoords, new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector3(0.01, 0.01, 0.01), Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b), false, false, false, null, null, false);
                }
              }
            } else {
              await Delay(100);
            }
          } else {
            await Delay(500);
          }
        });
      } else {
        if (!this.laserTick !== undefined) {
          clearTick(this.laserTick);
          this.laserTick = undefined;
          const notify = new Notification("Laser Sight", "The laser sight has been disabled!", NotificationTypes.Info);
          await notify.send();
        }
      }
    } else {
      const notify = new Notification("Laser Sight", "The laser sight is only supported on the taser!", NotificationTypes.Error);
      await notify.send();
    }
  }

  private reloadCartridges(): void {
    const weapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

    // if we aren't unarmed
    if (weapon === Weapons.X26Tazer) {
      if (this.cartridges <= 0) {
        
        const progress = new Progress(clientConfig.controllers.weapons.taser.cartridges.refillLength, {
          combat: true
        }, async() => {
          ClearPedTasks(Game.PlayerPed.Handle);
          this.reloadingCartridges = false;
          const notify = new Notification("Weapon", "You stopped refilling your tazers cartridges!", NotificationTypes.Error);
          await notify.send();
        }, async() => {
          const loadedAnim = await LoadAnim("weapons@first_person@aim_rng@generic@pistol@pistol_50@str");
          if (loadedAnim) {
            PlayAnim(Game.PlayerPed, "weapons@first_person@aim_rng@generic@pistol@pistol_50@str", "reload_aim", 49, clientConfig.controllers.weapons.taser.cartridges.refillLength, 8.0, -8.0, 0.0, false, false, false);
          }
        }, async() => {
          StopAnimTask(Game.PlayerPed.Handle, "weapons@first_person@aim_rng@generic@pistol@pistol_50@str", "reload_aim", 1.0);
          clearTick(this.cartridgeTick);
          this.cartridgeTick = undefined;
          this.cartridges = this.maxCartridges;
          this.reloadingCartridges = false;
          const notify = new Notification("Weapon", "You've reloaded your tazers cartridges!", NotificationTypes.Info);
          await notify.send();
        })

        progress.start();
      }
    }
  }

  // Events
  private async gunshot(): Promise<void> {
    const weapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

    // if we aren't unarmed
    if (weapon === Weapons.X26Tazer) {
      if (this.cartridges - 1 < 0) {
        this.cartridges = 0;
      } else {
        this.cartridges--;
      }

      if (this.cartridges <= 0) {
        if (this.cartridgeTick === undefined) this.cartridgeTick = setTick(() => {
          const weapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable
      
          // if we aren't unarmed
          if (weapon === Weapons.X26Tazer) {
            if (this.cartridges <= 0) {
              DisableControlAction(0, Control.Reload, true);
              DisableControlAction(0, Control.MeleeAttackLight, true);
              DisableControlAction(0, Control.MeleeAttackHeavy, true);
              DisableControlAction(0, Control.MeleeAttackAlternate, true);
              DisablePlayerFiring(Game.Player.Handle, true);

              if (Game.isControlJustPressed(0, Control.Attack) || Game.isDisabledControlJustPressed(0, Control.Attack)) {
                PlaySoundFrontend(-1, "Place_Prop_Fail", "DLC_Dmod_Prop_Editor_Sounds", false);
                Screen.showSubtitle("~r~Reload tazer catridges!");
              }

              if (!this.reloadingCartridges) {
                Screen.displayHelpTextThisFrame("~y~Reload Tazer Cartridges");
              }
            }
          }
        });
      }
    }
  }
}