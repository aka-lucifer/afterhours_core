import { Vector3, Ped, Game, Entity, World, MarkerType, Color, RaycastResult, Model, WeaponHash } from "fivem-js";

import { Delay, Inform, NumToVector3 } from "../../utils";

import { Notification } from "../../models/ui/notification";

import clientConfig from "../../../configs/client.json";
import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Menu } from "../../models/ui/menu/menu";
import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { Submenu } from "../../models/ui/menu/submenu";

const screenEffects = [
  "SwitchHUDIn",
  "SwitchHUDOut",
  "FocusIn",
  "FocusOut",
  "MinigameEndNeutral",
  "MinigameEndTrevor",
  "MinigameEndFranklin",
  "MinigameEndMichael",
  "MinigameTransitionOut",
  "MinigameTransitionIn",
  "SwitchShortNeutralIn",
  "SwitchShortFranklinIn",
  "SwitchShortTrevorIn",
  "SwitchShortMichaelIn",
  "SwitchOpenMichaelIn",
  "SwitchOpenFranklinIn",
  "SwitchOpenTrevorIn",
  "SwitchHUDMichaelOut",
  "SwitchHUDFranklinOut",
  "SwitchHUDTrevorOut",
  "SwitchShortFranklinMid",
  "SwitchShortMichaelMid",
  "SwitchShortTrevorMid",
  "DeathFailOut",
  "CamPushInNeutral",
  "CamPushInFranklin",
  "CamPushInMichael",
  "CamPushInTrevor",
  "SwitchOpenMichaelIn",
  "SwitchSceneFranklin",
  "SwitchSceneTrevor",
  "SwitchSceneMichael",
  "SwitchSceneNeutral",
  "MP_Celeb_Win",
  "MP_Celeb_Win_Out",
  "MP_Celeb_Lose",
  "MP_Celeb_Lose_Out",
  "DeathFailNeutralIn",
  "DeathFailMPDark",
  "DeathFailMPIn",
  "MP_Celeb_Preload_Fade",
  "PeyoteEndOut",
  "PeyoteEndIn",
  "PeyoteIn",
  "PeyoteOut",
  "MP_race_crash",
  "SuccessFranklin",
  "SuccessTrevor",
  "SuccessMichael",
  "DrugsMichaelAliensFightIn",
  "DrugsMichaelAliensFight",
  "DrugsMichaelAliensFightOut",
  "DrugsTrevorClownsFightIn",
  "DrugsTrevorClownsFight",
  "DrugsTrevorClownsFightOut",
  "HeistCelebPass",
  "HeistCelebPassBW",
  "HeistCelebEnd",
  "HeistCelebToast",
  "MenuMGHeistIn",
  "MenuMGTournamentIn",
  "MenuMGSelectionIn",
  "ChopVision",
  "DMT_flight_intro",
  "DMT_flight",
  "DrugsDrivingIn",
  "DrugsDrivingOut",
  "SwitchOpenNeutralFIB5",
  "HeistLocate",
  "MP_job_load",
  "RaceTurbo",
  "MP_intro_logo",
  "HeistTripSkipFade",
  "MenuMGHeistOut",
  "MP_corona_switch",
  "MenuMGSelectionTint",
  "SuccessNeutral",
  "ExplosionJosh3",
  "SniperOverlay",
  "RampageOut",
  "Rampage",
  "Dont_tazeme_bro",
  "DeathFailOut"
]

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

  constructor() {
    Inform("Weapon | Taser Controller", "Started!");

    RegisterCommand("+toggle_laser", this.toggleLaser.bind(this), false);
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
      }

      await Delay(500);
    });
  }

  private rotationToDirection(rotation: Vector3): Vector3 {
    const adjustedRotation = new Vector3(
      (Math.PI / 180) * rotation.x,
      (Math.PI / 180) * rotation.y,
      (Math.PI / 180) * rotation.z
    );
  
    const direction = new Vector3(
      -Math.sin(adjustedRotation.z) * Math.abs(Math.cos(adjustedRotation.x)),
      Math.cos(adjustedRotation.z) * Math.abs(Math.cos(adjustedRotation.x)),
      Math.sin(adjustedRotation.x)
    );
  
    return direction;
  }
  
  private screenToWorld(pos: Vector3, distance: number, ped: Ped): [boolean, Vector3] {
    const camRot = NumToVector3(GetGameplayCamRot(2));
    const direction = this.rotationToDirection(camRot);
    const destination = new Vector3(
      pos.x + direction.x * distance,
      pos.y + direction.y * distance,
      pos.z + direction.z * distance,
    );
  
    const result = new RaycastResult(StartShapeTestRay(pos.x, pos.y, pos.z, destination.x, destination.y, destination.z, -1, ped.Handle, 1));
    return [result.DidHit, result.HitPosition];
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
              const [hit, coords] = this.screenToWorld(weapon.Position, 15000, myPed);

              if (hit) {
                World.drawLine(weapon.Position, coords, Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b));
                World.drawMarker(MarkerType.DebugSphere, coords, new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector3(0.01, 0.01, 0.01), Color.fromRgb(clientConfig.controllers.weapons.taser.laser.colour.r, clientConfig.controllers.weapons.taser.laser.colour.g, clientConfig.controllers.weapons.taser.laser.colour.b), false, false, false, null, null, false);
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
}