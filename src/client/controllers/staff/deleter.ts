import {Client} from "../../client";

import {Events} from "../../../shared/enums/events/events";
import {Ranks} from "../../../shared/enums/ranks";

import {Game, InputMode, Control, Entity, Bone, Prop, Vector3} from "fivem-js";
import {Weapons} from "../../../shared/enums/weapons";
import {Delay} from "../../utils";

export class Deleter {
  private client: Client;
  private toggled: boolean = false;
  private heldEntity: Entity;
  private holding: boolean = false;

  constructor(client: Client) {
    this.client = client;

    if (this.client.player.Rank >= Ranks.Admin) {
      onNet(Events.adminGun, this.EVENT_adminGun.bind(this));

      RegisterKeyMapping("attach_entity", "Attach the aimed entity to your gravity gun", "KEYBOARD", "E");
      RegisterKeyMapping("shoot_attached_entity", "Shoot the attached entity forward", "MOUSE_BUTTON", "MOUSE_LEFT");
      RegisterKeyMapping("scroll_attached_entity_forward", "Moves the attached entity forward", "MOUSE_WHEEL", "IOM_WHEEL_UP");
      RegisterKeyMapping("scroll_attached_entity_backward", "Moves the attached entity backward", "MOUSE_WHEEL", "IOM_WHEEL_DOWN");
      RegisterKeyMapping("delete_attached_entity", "Moves the attached entity backward", "KEYBOARD", "DELETE");

      RegisterCommand("attach_entity", this.attachEntity.bind(this), false);
      RegisterCommand("shoot_attached_entity", this.shootEntity.bind(this), false);
      RegisterCommand("scroll_attached_entity_forward", this.scrollForward.bind(this), false);
      RegisterCommand("scroll_attached_entity_backward", this.scrollBackward.bind(this), false);
      RegisterCommand("delete_attached_entity", this.deleteEntity.bind(this), false);
    }
  }

  // Methods
  private async attachEntity(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.toggled) {
        const myPed = Game.PlayerPed;

        if (GetSelectedPedWeapon(myPed.Handle) == Weapons.Deleter) {
          if (IsPlayerFreeAiming(Game.Player.Handle)) {
            if (!this.holding) { // If no entity is held
              let [bool, foundEntity] = GetEntityPlayerIsFreeAimingAt(Game.Player.Handle);
              bool = false;

              if (foundEntity > 0) {
                this.holding = true;

                if (IsEntityAPed(foundEntity)) {
                  if (IsPedInAnyVehicle(foundEntity, false)) {
                    foundEntity = GetVehiclePedIsIn(foundEntity, false);
                  }
                }

                const myPos = myPed.Position;
                this.heldEntity = new Entity(foundEntity);
                const dist = myPos.distance(this.heldEntity.Position);

                SetEntityAlpha(this.heldEntity.Handle, 200, 0);
                AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist, 0.0, 0.0, -90.0, -95.0, 0.0, true, true, false, true, 0, true);
              }
            } else {
              this.heldEntity.detach();
              new Prop(this.heldEntity.Handle).placeOnGround();
              SetEntityAlpha(this.heldEntity.Handle, 255, 0);
              this.heldEntity = undefined;
              this.holding = false;
            }
          }
        }
      }
    }
  }

  private shootEntity(): void {
    console.log("STEP 1!");
    if (this.client.player.Rank >= Ranks.Admin) {
      console.log("STEP 2", this.toggled);
      if (this.toggled) {
        console.log("STEP 3!");
        console.log("SHOT!");
        this.heldEntity.detach();
        const temp = this.heldEntity;
        this.stop();
        console.log("temp", temp);

        const [forwardX, forwardY, forwardZ] = GetEntityForwardVector(temp.Handle);
        // ApplyForceToEntity(temp.Handle, 3, 0, 1000, 0, 0, 0, 0, 0, false, true, true, false, true);
        ApplyForceToEntity(temp.Handle, 1, 0, 350, 0, 0, 0, 0, 0, true, true, true, false, true);
      }
    }
  }

  private scrollForward(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.toggled) {
        if (this.holding && this.heldEntity != undefined) {
          const myPed = Game.PlayerPed;
          const myPos = myPed.Position;
          const dist = myPos.distance(this.heldEntity.Position);

          SetEntityAlpha(this.heldEntity.Handle, 200, 0);
          AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist + 0.5, 0.0, 0.0, -78.5, 0.0, 0.0, true, true, false, true, 0, true);
        }
      }
    }
  }

  private scrollBackward(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.toggled) {
        if (this.holding && this.heldEntity != undefined) {
          const myPed = Game.PlayerPed;
          const myPos = myPed.Position;
          const dist = myPos.distance(this.heldEntity.Position);

          SetEntityAlpha(this.heldEntity.Handle, 200, 0);
          AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist - 0.5, 0.0, 0.0, -70.5, 0.0, 0.0, true, true, false, true, 0, true);
        }
      }
    }
  }

  private deleteEntity(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.toggled) {
        if (this.holding && this.heldEntity !== undefined) {
          if (NetworkGetEntityIsNetworked(this.heldEntity.Handle)) {
            let attempt = 0;
            while (!NetworkHasControlOfEntity(this.heldEntity.Handle) && attempt < 50 && this.heldEntity.exists()) {
              NetworkRequestControlOfEntity(this.heldEntity.Handle);
              attempt++;
            }

            if (this.heldEntity.exists() && NetworkHasControlOfEntity(this.heldEntity.Handle)) {
              SetEntityAsMissionEntity(this.heldEntity.Handle, false, true);
              this.heldEntity.delete();
              this.stop();
            }
          } else {
            this.heldEntity.delete();
            this.stop();
          }
        }
      }
    }
  }

  private EVENT_adminGun(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      this.toggled = !this.toggled;
    }
  }

  private stop(): void {
    this.heldEntity = null;
    this.holding = false;
  }
}
