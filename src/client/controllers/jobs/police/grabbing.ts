
import { LoadAnim } from "../../../utils";

import { PoliceEvents } from "../../../../shared/enums/events/events"

import { Game } from "fivem-js";

enum GrabState {
  Holding,
  Held
}

export class Grabbing {
  // Grabber Data
  private grabbed: boolean;
  private grabbing: number;
  private grabbingDict: string = "amb@world_human_drinking@coffee@male@base";

  // Grabbee Data
  private grabbedBy: number;
  private grabbedDict: string = "mp_arresting";

  // Shared
  private grabType: GrabState;
  private animTicks: number = undefined;

  constructor() {

    // Events
    onNet(PoliceEvents.startGrabbing, this.EVENT_startGrabbing.bind(this));
    onNet(PoliceEvents.setGrabbed, this.EVENT_setGrabbed.bind(this));
  }

  // Methods
  private startAnims(): void {
    this.animTicks = setTick(() => {
      if (this.grabbed) {
        if (this.grabType == GrabState.Held) {
          // if cuffed do mp arresting
          if (!IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 3)) {
            TaskPlayAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 2.0, 1.0, -1, 14, 1.0, false, false, false);
          }
        } else if (this.grabType == GrabState.Holding) {
          if (!IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbingDict, "base", 3)) {
            TaskPlayAnim(Game.PlayerPed.Handle, this.grabbingDict, "base", 2.0, 1.0, -1, 49, 1.0, false, false, false);
          }
        }
      }
    });
  }

  public stop() {
    if (this.grabbed && this.grabType == GrabState.Held) {
      DetachEntity(Game.PlayerPed.Handle, false, false);
      if (this.animTicks !== undefined) {
        clearTick(this.animTicks);
        this.animTicks = undefined;
      }
    }
  }

  // Events
  private async EVENT_startGrabbing(grabbeeId: number): Promise<void> {
    const loadedAnim = LoadAnim(this.grabbedDict);
    if (loadedAnim) {
      this.grabbing = grabbeeId;
      this.grabType = GrabState.Holding;
      emitNet(PoliceEvents.grabPlayer, grabbeeId);
      this.grabbed = true;
      this.startAnims();
    } else {
      console.log("COULDN'T LOAD GRABBED ANIM DICT!");
    }
  }

  private async EVENT_setGrabbed(grabbersId: number): Promise<void> {
    const grabbersPed = GetPlayerPed(GetPlayerFromServerId(grabbersId));
    if (grabbersPed > 0 && grabbersPed != Game.PlayerPed.Handle) {
      const loadedAnim = LoadAnim(this.grabbedDict);
      if (loadedAnim) {
        this.grabbedBy = grabbersPed;
        AttachEntityToEntity(Game.PlayerPed.Handle, grabbersPed, 0, 0.2, 0.5, 0.0, 0.5, 0.5, 0, false, false, true, false, 2, false);
        this.grabType = GrabState.Held;
        this.grabbed = true;
        this.startAnims();
      } else {
        console.log("COULDN'T LOAD GRABBED ANIM DICT!");
      }
    }
  }
}