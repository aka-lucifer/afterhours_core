import { Bone, Game, Ped } from "fivem-js";

import { Client } from "../../client";

import { Notification } from "../../models/ui/notification";

import { Events } from "../../../shared/enums/events/events";
import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class Disarmer {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.gameEventTriggered, this.gameEvent.bind(this));
  }

  // Events
  private async gameEvent(eventName: string, eventArgs: any[]): Promise<void> {
    if (eventName == "CEventNetworkEntityDamage") {
      const myPed = Game.PlayerPed;
      const damagedEntity = new Ped(eventArgs[0]);
      if (damagedEntity.Handle == myPed.Handle) {
        const currWeapon = GetSelectedPedWeapon(damagedEntity.Handle);
        if (currWeapon != Weapons.Unarmed) {
          const [boneHit, damagedBone] = GetPedLastDamageBone(damagedEntity.Handle);
          if (boneHit) {
            if (damagedBone == Bone.SKEL_R_Hand || damagedBone == Bone.SKEL_R_Forearm || damagedBone == Bone.SKEL_R_UpperArm) {
              SetPedDropsInventoryWeapon(damagedEntity.Handle, currWeapon, 0, 2.0, 0, -1);
              const notify = new Notification("Weapon", "You've dropped your weapon as you were shot in the hand.", NotificationTypes.Warning);
              await notify.send();
            }
          }
        }
      }
    }
  }
}