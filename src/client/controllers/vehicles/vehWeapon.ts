import { Bone, Game, Model, Prop, VehicleSeat, World } from "fivem-js";

import { Delay, Inform } from "../../utils";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";

import sharedConfig from "../../../configs/shared.json";

export class VehicleWeapon {
  private currentWeapon: number;
  private attachedWeaponHash: number;
  private attachedWeapon: Prop;
  private hasAttached: boolean = false;
  private visible: boolean = true;

  // Ticks
  private propTick: number = undefined;
  private aimTick: number = undefined;

  constructor() {
    this.currentWeapon = Weapons.Unarmed;

    // Events
    onNet(LXEvents.EnteredVeh_Cl, this.EVENT_enteredVeh.bind(this));
    onNet(LXEvents.LeftVeh_Cl, this.EVENT_leftVeh.bind(this));

    Inform("Vehicle | Weapon Controller", "Started!");
  }

  // Methods
  public stop(): void {
    if (this.attachedWeapon != null && this.attachedWeapon.exists()) {
      this.attachedWeapon.delete();
      this.attachedWeapon = undefined;
    }
  }

  public async changedWeapon(newWeapon: number): Promise<void> {
    this.currentWeapon = newWeapon;
  }

  private startAim(): void {
    if (this.aimTick === undefined) this.aimTick = setTick(() => {
      console.log("aim thing!");
    });
  }

  private stopAim(): void {
    if (this.aimTick !== undefined) {
      clearTick(this.aimTick);
      this.aimTick = undefined;
    }
  }

  // Events
  private EVENT_enteredVeh(vehNet: number, vehSeat: VehicleSeat, vehName: string): void {
    console.log("entered veh", vehNet, vehSeat, vehName);

    if (this.propTick === undefined) this.propTick = setTick(async() => {
      if (!this.hasAttached) {
        if (this.currentWeapon != Weapons.Unarmed) {
          const currWeapData = sharedConfig.weapons[this.currentWeapon];
          if (currWeapData) {
            if (currWeapData.type == "weapon") {
              const weaponModel = new Model(currWeapData.attaching.model);
              const loadedModel = await weaponModel.request(2000);

              if (loadedModel) {
                this.attachedWeaponHash = this.currentWeapon;
                this.attachedWeapon = await World.createProp(weaponModel, Game.PlayerPed.Position, false, false);
                // console.log(this.attachedWeapon);
                AttachEntityToEntity(this.attachedWeapon.Handle, PlayerPedId(), GetPedBoneIndex(Game.PlayerPed.Handle, Bone.SKEL_R_Hand), 0.18, 0.035, -0.001, -82.2, -2.6449, -7.71, true, true, false, false, 1, true)
                // this.attachedWeapon.attachToBone(new EntityBone(Game.PlayerPed, GetPedBoneIndex(Game.PlayerPed.Handle, Bone.SKEL_R_Hand)), new Vector3(0.18, 0.035, -0.001), new Vector3(-82.2, -2.6449, -7.71));
                this.hasAttached = true;
              } else {
                console.log("model not loaded 1, it timed out!");
                await Delay(500);
              }
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        } else {
          await Delay(500);
        }
      } else {
        if (this.attachedWeaponHash !== this.currentWeapon) {
          const currWeapData = sharedConfig.weapons[this.currentWeapon];
          if (currWeapData) {
            if (currWeapData.type == "weapon") {
              const weaponModel = new Model(currWeapData.attaching.model);
              const loadedModel = await weaponModel.request(2000);

              if (loadedModel) {
                this.attachedWeaponHash = this.currentWeapon;
                this.attachedWeapon = await World.createProp(weaponModel, Game.PlayerPed.Position, false, false);
                console.log(this.attachedWeapon);
                AttachEntityToEntity(this.attachedWeapon.Handle, PlayerPedId(), GetPedBoneIndex(Game.PlayerPed.Handle, Bone.SKEL_R_Hand), 0.18, 0.035, -0.001, -82.2, -2.6449, -7.71, true, true, false, false, 1, true)
                // this.attachedWeapon.attachToBone(new EntityBone(Game.PlayerPed, GetPedBoneIndex(Game.PlayerPed.Handle, Bone.SKEL_R_Hand)), new Vector3(0.18, 0.035, -0.001), new Vector3(-82.2, -2.6449, -7.71));
                this.hasAttached = true;
              } else {
                console.log("model not loaded 2, it timed out!");
                await Delay(500);
              }
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        }
      }

      if (IsPlayerFreeAiming(Game.Player.Handle)) {
        if (this.visible) {
          this.attachedWeapon.IsVisible = false;
          this.visible = false;
        } else {
          await Delay(500);
        }
      } else {
        if (!this.visible) {
          await Delay(100);
          this.attachedWeapon.IsVisible = true;
          this.visible = true;
        } else {
          await Delay(500);
        }
      }
    });
  }
  
  private EVENT_leftVeh(vehNet: number, vehSeat: VehicleSeat, vehName: string): void {
    console.log("left veh", vehNet, vehSeat, vehName);

    if (this.propTick !== undefined) {
      clearTick(this.propTick);
      this.propTick = undefined;
      if (this.attachedWeapon != null && this.attachedWeapon.exists()) {
        this.attachedWeapon.delete();
        this.attachedWeapon = undefined;
      }
      this.hasAttached = false;
    }
  }
}