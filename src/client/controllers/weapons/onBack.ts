import { Delay, GetHash, Inform } from "../../utils";

import sharedConfig from "../../../configs/shared.json";
import { Events } from "../../../shared/enums/events/events";
import { Entity, Game, Model, Ped, Vector3, World } from "fivem-js";

interface Weapon {
  name: string,
  bone: number,
  position: Vector3,
  rotation: Vector3,
  model: Model
}

interface AttachedWeapon {
  model: Model,
  hash: string | number,
  entity: Entity
}

export class OnBack {
  private weapons: Weapon[] = [];

  // Checking
  private processTick: number = undefined;
  private hasWeapon: boolean = false;

  // Attaching
  private attachedModel: Model;
  private attachedWeapons: AttachedWeapon[] = [];
  private attached: boolean = false;
  private attachTick: number = undefined;

  constructor() {
    Inform("Weapon | On Back Controller", "Started!");
    
    // Events
    on(Events.resourceStop, this.EVENT_resourceStop.bind(this));
  }

  // Methods
  public getWeapons(): void {
    for (const [index, value] of Object.entries(sharedConfig.weapons)) {
      const attachData = sharedConfig.weapons[index].attaching;
      if (attachData !== undefined) {
        if (attachData.canAttach) {
          this.weapons.push({
            name: value.name,
            bone: attachData.bone,
            position: new Vector3(attachData.x, attachData.y, attachData.z),
            rotation: new Vector3(attachData.xRotation, attachData.yRotation, attachData.zRotation),
            model: new Model(attachData.model)
          });
        }
      }
    }

    // console.log("weapons", JSON.stringify(this.weapons));
  }

  private reattachWeapons(ped: Ped): void {
    for (let i = 0; i < this.weapons.length; i++) {
      const attachIndex = this.attachedWeapons.findIndex(attachData => attachData.model === this.weapons[i].model);
      if (attachIndex !== -1) {
        const boneIndex = GetPedBoneIndex(ped.Handle, this.weapons[i].bone);
        // console.log("reattach", this.weapons[i].model);
        
        AttachEntityToEntity(this.attachedWeapons[attachIndex].entity.Handle, ped.Handle, boneIndex, this.weapons[i].position.x, this.weapons[i].position.y, this.weapons[i].position.z, this.weapons[i].rotation.x, this.weapons[i].rotation.y, this.weapons[i].rotation.z, false, false, false, false, 2, true)
      }
    }
  }

  private async attachWeapon(ped: Ped, weapon: Weapon): Promise<void> {
    const modelHash = weapon.model;
    const weaponHash = GetHash(weapon.name);

    const loadedModel = await modelHash.request(2000);
    if (loadedModel) {
      // modelHash.markAsNoLongerNeeded();
      const createdWeapon = await World.createProp(modelHash, new Vector3(0.0, 0.0, 0.0), false, true);
      this.attachedWeapons.push({
        model: modelHash,
        hash: weaponHash,
        entity: createdWeapon
      });

      const boneIndex = GetPedBoneIndex(ped.Handle, weapon.bone);
      // console.log("attach weapon to", weapon.bone, boneIndex, weapon.position, weapon.rotation);
      AttachEntityToEntity(createdWeapon.Handle, ped.Handle, boneIndex, weapon.position.x, weapon.position.y, weapon.position.z, weapon.rotation.x, weapon.rotation.y, weapon.rotation.z, false, false, false, false, 2, true)
      // createdWeapon.attachToBone(new EntityBone(ped, boneIndex), weapon.position, weapon.rotation);
    }
  }

  private stopAttaching(): void {
    if (this.attachTick !== undefined) {
      clearTick(this.attachTick);
      this.attachTick = undefined;
      this.attachedModel = undefined;
      this.attachedWeapons = [];
      this.attached = false;
    }
  }

  private startAttaching(): void {
    if (this.attachTick === undefined) this.attachTick = setTick(async() => {
      // console.log("run tick!");
      const myPed = Game.PlayerPed;

      // Attach Weapons on back if you have one, and it isn't equiped
      for (let i = 0; i < this.weapons.length; i++) {
        const weaponHash = GetHash(this.weapons[i].name);

        if (HasPedGotWeapon(myPed.Handle, weaponHash, false) && GetSelectedPedWeapon(myPed.Handle) !== GetHash(this.weapons[i].name)) {
          const attachedIndex = this.attachedWeapons.findIndex(weaponData => weaponData.hash === weaponHash);
          if (attachedIndex === -1) {
            if (!this.attached) {
              this.attached = true;
              this.attachedModel = myPed.Model;
            }

            // console.log("attach", this.weapons[i].name);
            await this.attachWeapon(myPed, this.weapons[i]);
          }
        }
      }

      // Remove from back, if weapon is in hand
      
      if (this.attachedWeapons.length > 0) {
        if (this.attached) {

          // If we have changed our ped, reattach the weapons to our new ped and update our attached model
          if (myPed.Model.Hash !== this.attachedModel.Hash) {
            this.reattachWeapons(myPed);
            this.attachedModel = myPed.Model;
          }
        }

        this.attachedWeapons.forEach((weapon, index) => {
          const currWeapon = GetSelectedPedWeapon(myPed.Handle);
          const hasWeapon = HasPedGotWeapon(myPed.Handle, weapon.hash, false);

          if (currWeapon == weapon.hash || !hasWeapon) {
            weapon.entity.delete();
            this.attachedWeapons.splice(index, 1);
          }
        });
      }

      await Delay(500);
    });
  }

  public start(): void {
    this.getWeapons();

    if (this.processTick === undefined) this.processTick = setTick(async() => {
      this.hasWeapon = false;

      for (let i = 0; i < this.weapons.length; i++) {
        if (HasPedGotWeapon(Game.PlayerPed.Handle, GetHash(this.weapons[i].name), false)) {
          this.hasWeapon = true;
        }
      }

      if (this.hasWeapon) {
        if (this.attachTick === undefined) this.startAttaching();
      } else {
        if (this.attachedWeapons.length <= 0) {
          if (this.attachTick !== undefined) this.stopAttaching();
        }
      }

      await Delay(1000);
    });
  }

  public async clearWeapons(): Promise<boolean> {
    if (this.attachedWeapons.length > 0) {
      // console.log("WEAPONS ARE ATTACHED!");

      for (let i = 0; i < this.attachedWeapons.length; i++) {
        this.attachedWeapons[i].entity.delete();
        this.attachedWeapons.splice(i, 1);

        if (i == (this.attachedWeapons.length - 1)) {
          return true;
        }
      }

      return true;
    } else {
      return true;
    }
  }

  // Events
  private async EVENT_resourceStop(resourceName: string): Promise<void> {
    if (resourceName == GetCurrentResourceName()) {
      await this.clearWeapons();
    }
  }
}
