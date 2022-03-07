import {Client} from "../../client";

import { Notification } from "../../models/ui/notification";

import {Events} from "../../../shared/enums/events/events";
import {Ranks} from "../../../shared/enums/ranks";
import {Weapons} from "../../../shared/enums/weapons";
import clientConfig from "../../../configs/client.json";

import {Game, Entity, Bone, Prop, Ped, Vehicle, VehicleSeat} from "fivem-js";
import {Delay, GetHash} from "../../utils";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class Deleter {
  private client: Client;
  private heldEntity: Entity | Vehicle | Ped;
  private holding: boolean = false;
  private controlTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    if (this.client.player.Rank >= Ranks.Admin) {
      // Events
      // (Players)
      onNet(Events.setHeldEntity, this.EVENT_setHeldEntity.bind(this));
      onNet(Events.unsetHeldEntity, this.EVENT_unHeldEntity.bind(this));
      onNet(Events.holdPlayer, this.EVENT_holdPlayer.bind(this));
      onNet(Events.releasePlayer, this.EVENT_releasePlayer.bind(this));
      onNet(Events.getGravitied, this.EVENT_getGravitied.bind(this));

      // Key Mappings
      RegisterKeyMapping("attach_entity", "Attach the entity to gravity gun", "KEYBOARD", "E");
      RegisterKeyMapping("shoot_attached_entity", "Shoot attached entity forward", "MOUSE_BUTTON", "MOUSE_LEFT");
      RegisterKeyMapping("scroll_attached_entity_forward", "Move attached entity forward", "MOUSE_WHEEL", "IOM_WHEEL_UP");
      RegisterKeyMapping("scroll_attached_entity_backward", "Move attached entity backward", "MOUSE_WHEEL", "IOM_WHEEL_DOWN");
      RegisterKeyMapping("delete_attached_entity", "Deletes the attached entity", "KEYBOARD", "DELETE");

      // Key Mapped Commands
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
      const myPed = Game.PlayerPed;

      if (GetSelectedPedWeapon(myPed.Handle) == Weapons.Deleter) {
        if (IsPlayerFreeAiming(Game.Player.Handle)) {
          if (!this.holding) { // If no entity is held
            let [bool, foundEntity] = GetEntityPlayerIsFreeAimingAt(Game.Player.Handle);
            bool = false;

            if (foundEntity > 0) {
              const exists = clientConfig.controllers.deleter.propBlacklist.find(entity =>  GetHash(entity) == GetEntityModel(foundEntity));
              if (!exists) {
                const isPlayer = ((GetEntityType(foundEntity) == 1) && IsPedAPlayer(foundEntity));
                if (!isPlayer) {
                  this.holding = true;

                  if (IsEntityAPed(foundEntity)) {
                    if (IsPedInAnyVehicle(foundEntity, false)) {
                      foundEntity = GetVehiclePedIsIn(foundEntity, false);
                    }
                  }

                  const myPos = myPed.Position;
                  this.heldEntity = new Entity(foundEntity);
                  const dist = myPos.distance(this.heldEntity.Position);

                  if (!NetworkGetEntityIsNetworked(this.heldEntity.Handle)) {
                    let attempt = 0;

                    while (!NetworkGetEntityIsNetworked(this.heldEntity.Handle) && attempt < 50) {
                      NetworkRegisterEntityAsNetworked(this.heldEntity.Handle);
                      attempt++;

                      await Delay(0);
                    }
                  }

                  const hasControl = this.requestControlOfEntity(this.heldEntity);
                  if (hasControl) {
                    SetEntityAlpha(this.heldEntity.Handle, 200, 0);
                    AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist, 0.0, 0.0, -90.0, -95.0, 0.0, true, true, false, true, 0, true);
                  }
                } else {
                  emitNet(Events.gravityPlayer, GetPlayerServerId(NetworkGetPlayerIndexFromPed(foundEntity)));
                }
              } else {
                const notify = new Notification("Gravity Gun", "You can't pickup this entity", NotificationTypes.Error);
                await notify.send();
              }
            }
          } else {
            let isPlayer;

            if (GetEntityType(this.heldEntity.Handle) == 1) {
              if (IsPedAPlayer(this.heldEntity.Handle)) {
                isPlayer = true;
              }
            } else if (GetEntityType(this.heldEntity.Handle) == 2) {
              const driver = GetPedInVehicleSeat(this.heldEntity.Handle, VehicleSeat.Driver);
              if (IsPedAPlayer(driver)) {
                this.heldEntity = new Ped(driver);
                isPlayer = true;
              }
            }

            if (!isPlayer) {
              this.heldEntity.detach();
              new Prop(this.heldEntity.Handle).placeOnGround();
              SetEntityAlpha(this.heldEntity.Handle, 255, 0);
              this.heldEntity = undefined;
              this.holding = false;
            } else {
              this.holding = false;
              emitNet(Events.ungravityPlayer, GetPlayerServerId(NetworkGetPlayerIndexFromPed(this.heldEntity.Handle)));
            }
          }
        }
      }
    }
  }

  private shootEntity(): void {
    if (this.client.player.Rank >= Ranks.SeniorAdmin) {
      if (this.holding && this.heldEntity != undefined) {
        let isPlayer;

        if (GetEntityType(this.heldEntity.Handle) == 1) {
          if (IsPedAPlayer(this.heldEntity.Handle)) {
            isPlayer = true;
          }
        } else if (GetEntityType(this.heldEntity.Handle) == 2) {
          const driver = GetPedInVehicleSeat(this.heldEntity.Handle, VehicleSeat.Driver);
          if (IsPedAPlayer(driver)) {
            this.heldEntity = new Ped(driver);
            isPlayer = true;
          }
        }

        if (!isPlayer) {
          this.heldEntity.detach();
          SetEntityAlpha(this.heldEntity.Handle, 255, 0);
          const temp = this.heldEntity;
          this.stop();
          ApplyForceToEntity(temp.Handle, 1, 0, 350, 0, 0, 0, 0, 0, true, true, true, false, true);
        } else {
          emitNet(Events.shootEntity, GetPlayerServerId(NetworkGetPlayerIndexFromPed(this.heldEntity.Handle)));
        }
      }
    }
  }

  private scrollForward(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.holding && this.heldEntity != undefined) {
        const myPed = Game.PlayerPed;
        const myPos = myPed.Position;
        const dist = myPos.distance(this.heldEntity.Position);

        SetEntityAlpha(this.heldEntity.Handle, 200, 0);
        AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist + 0.5, 0.0, 0.0, -78.5, 0.0, 0.0, true, true, false, true, 0, true);
      }
    }
  }

  private scrollBackward(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.holding && this.heldEntity != undefined) {
        const myPed = Game.PlayerPed;
        const myPos = myPed.Position;
        const dist = myPos.distance(this.heldEntity.Position);

        SetEntityAlpha(this.heldEntity.Handle, 200, 0);
        AttachEntityToEntity(this.heldEntity.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.PH_R_Hand), dist - 0.5, 0.0, 0.0, -70.5, 0.0, 0.0, true, true, false, true, 0, true);
      }
    }
  }

  private async deleteEntity(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.holding && this.heldEntity !== undefined) {
        if (NetworkGetEntityIsNetworked(this.heldEntity.Handle)) {
          let attempt = 0;
          while (!NetworkHasControlOfEntity(this.heldEntity.Handle) && attempt < 50 && this.heldEntity.exists()) {
            NetworkRequestControlOfEntity(this.heldEntity.Handle);
            attempt++;

            await Delay(0);
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

  private stop(): void {
    this.heldEntity = null;
    this.holding = false;
  }

  private async requestControlOfId(id: number): Promise<boolean> {
    let attempt = 0;
    while (!NetworkHasControlOfNetworkId(id) && attempt < 50) {
      NetworkRequestControlOfNetworkId(id);
      attempt++;

      await Delay(0);
    }

    return NetworkHasControlOfNetworkId(id);
  }

  private async requestControlOfEntity(entity: Entity): Promise<boolean> {
    if (NetworkGetEntityIsNetworked(entity.Handle)) {
      let attempt = 0;

      while (!NetworkHasControlOfEntity(entity.Handle) && attempt < 50 && entity.exists()) {
        NetworkRequestControlOfEntity(entity.Handle);
        attempt++;

        await Delay(0);
      }

      const id = NetworkGetNetworkIdFromEntity(entity.Handle);
      const hasControl = await this.requestControlOfId(id);
      if (hasControl) {
        SetEntityAsMissionEntity(entity.Handle, true, true);
        SetNetworkIdCanMigrate(id, true);
        return true;
      } else {
        return false;
      }
    }
  }

  // Events
  private EVENT_setHeldEntity(heldEntity: any): void {
    const heldPed = new Ped(GetPlayerPed(GetPlayerFromServerId(heldEntity.handle)));
    if (heldPed.CurrentVehicle) {
      this.heldEntity = heldPed.CurrentVehicle;
    } else {
      this.heldEntity = heldPed;
    }
    this.holding = true;
  }

  private EVENT_unHeldEntity(): void {
    this.stop();
  }

  private EVENT_holdPlayer(holderPlayer: any): void {
    const myPed = Game.PlayerPed;
    const holderPed = new Ped(GetPlayerPed(GetPlayerFromServerId(holderPlayer.handle)));

    if (myPed.CurrentVehicle) {
      this.heldEntity = myPed.CurrentVehicle;

      this.controlTick = setTick(() => {
        DisableControlAction(0, 23, true);
        DisableControlAction(0, 75, true);
      });
    } else {
      this.heldEntity = myPed;
    }

    const holderPos = holderPed.Position;
    const dist = holderPos.distance(this.heldEntity.Position);
    
    SetEntityAlpha(this.heldEntity.Handle, 200, 0);
    AttachEntityToEntity(this.heldEntity.Handle, holderPed.Handle, GetPedBoneIndex(holderPed.Handle, Bone.PH_R_Hand), dist, 0.0, 0.0, -90.0, -95.0, 0.0, true, true, false, true, 0, true);
  }

  private EVENT_releasePlayer(): void {

    if (GetEntityType(this.heldEntity.Handle) == 2) { // If a vehicle
      clearTick(this.controlTick);
      this.controlTick = undefined;
    }

    this.heldEntity.detach();
    SetEntityAlpha(this.heldEntity.Handle, 255, 0);
    this.stop();
  }

  private EVENT_getGravitied(): void {
    this.heldEntity.detach();
    SetEntityAlpha(this.heldEntity.Handle, 255, 0);
    
    if (GetEntityType(this.heldEntity.Handle) == 2) { // If a vehicle
      clearTick(this.controlTick);
      this.controlTick = undefined;
    }

    const temp = this.heldEntity;
    this.stop();
    ApplyForceToEntity(temp.Handle, 1, 0, 2000, 2000, 0, 0, 0, 0, true, true, true, false, true);
  }
}
