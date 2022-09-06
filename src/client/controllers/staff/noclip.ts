import { Entity, Game, Vehicle } from "fivem-js";

import { Client } from "../../client";
import { Inform } from "../../utils";

import { Ranks } from "../../../shared/enums/ranks";

const freecam = global.exports.freecam;

export class NoClip {
  private client: Client;
  private noClipTarget: Entity;

  constructor(client: Client) {
    this.client = client;

    if (this.client.player.Rank >= Ranks.Moderator) {

      // Events
      on("freecam:onFreecamUpdate", this.EVENT_freecamUpdate.bind(this));
      
      // Key Mapped Commands
      RegisterCommand("+toggle_noclip", this.toggleNoclip.bind(this), false);

      Inform("Staff | NoClip Controller", "Started!");
    }
  }

  // Getters
  public get Active(): boolean {
    return this.noClipTarget !== undefined;
  }

  // Methods
  private enable(): void {
    if (this.client.player.Rank >= Ranks.Moderator) {
      this.noClipTarget = Game.PlayerPed;

      if (IsPedInAnyVehicle(this.noClipTarget.Handle, false)) {
        this.noClipTarget = new Vehicle(GetVehiclePedIsIn(this.noClipTarget.Handle, false));
      }

      if (!NetworkHasControlOfEntity(this.noClipTarget.Handle)) {
        this.noClipTarget = undefined;
        return;
      }

      this.noClipTarget.IsInvincible = true;
      this.noClipTarget.IsPositionFrozen = true;
      this.noClipTarget.IsCollisionEnabled = false;
      this.noClipTarget.IsVisible = false;

      if (this.noClipTarget.Handle !== Game.PlayerPed.Handle) {
        Game.PlayerPed.IsVisible = false;
      }

      const entityCoords = GetEntityCoords(this.noClipTarget.Handle, false);

      freecam.SetEnabled(true);
      freecam.SetPosition(...entityCoords);
    }
  }

  private disable(): void {
    if (this.client.player.Rank >= Ranks.Moderator) {
      this.noClipTarget.IsInvincible = false;
      this.noClipTarget.IsPositionFrozen = false;
      this.noClipTarget.IsCollisionEnabled = true;
      this.noClipTarget.IsVisible = this.client.staffManager.staffMenu.Visible;

      if (this.noClipTarget.Handle !== Game.PlayerPed.Handle) {
        Game.PlayerPed.IsVisible = true;
      }

      this.noClipTarget = undefined;
      freecam.SetEnabled(false);
    }
  }

  public toggleNoclip(): void {
    if (this.client.player.Rank >= Ranks.Moderator) {

      if (freecam.IsEnabled()) {
        this.disable();
        this.client.richPresence.Status = undefined;
      } else {
        this.enable();
        this.client.richPresence.Status = "Noclipping Around The World";
      }
    }
  }

  // Events
  private EVENT_freecamUpdate(): void {
    if (this.client.player.Rank >= Ranks.Moderator) {
      const position = freecam.GetPosition();
      const rotation = freecam.GetRotation();

      if (this.noClipTarget) {
        SetEntityCoordsNoOffset(this.noClipTarget.Handle, position[0], position[1], position[2], false, false, false);
        SetEntityRotation(this.noClipTarget.Handle, rotation[0], rotation[1], rotation[2], 0, true);
      }
    }
  }
}
