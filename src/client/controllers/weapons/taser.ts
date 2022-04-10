import { Vector3, Ped, Game, Entity, World, MarkerType, Color, RaycastResult } from "fivem-js";

import { Delay, Inform, NumToVector3 } from "../../utils";

import { Notification } from "../../models/ui/notification";

import clientConfig from "../../../configs/client.json";
import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class Taser {
  // Laser Sight
  private laserToggled: boolean = false;
  private laserTick: number = undefined;
  
  // Cartridges
  private cartridges: number = 3;

  constructor() {
    Inform("Weapon | Taser Controller", "Started!");

    RegisterCommand("+toggle_laser", this.toggleLaser.bind(this), false);
  }

  // Methods
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
          console.log("laser disabled!");
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