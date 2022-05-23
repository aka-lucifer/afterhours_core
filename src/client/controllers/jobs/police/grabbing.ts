import { Game } from 'fivem-js';

import { Client } from '../../../client';
import { LoadAnim, PlayAnim } from '../../../utils';

import { JobEvents } from '../../../../shared/enums/events/jobs/jobEvents';
import { GrabState } from '../../../../shared/enums/jobs/grabStates';
import { CuffState } from '../../../../shared/enums/jobs/cuffStates';

export class Grabbing {
  private client: Client;

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

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.startGrabbing, this.EVENT_startGrabbing.bind(this));
    onNet(JobEvents.setGrabbed, this.EVENT_setGrabbed.bind(this));
    onNet(JobEvents.stopGrabbing, this.EVENT_stopGrabbing.bind(this));
  }

  // Methods
  private startAnims(): void {
    this.animTicks = setTick(() => {
      if (this.grabbed) {
        if (this.grabType == GrabState.Held) {
          const myStates = Player(this.client.player.NetworkId);
          // if cuffed do mp arresting

          if (myStates.state.cuffState == CuffState.Cuffed || myStates.state.cuffState == CuffState.Shackled) {
            if (!IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 3)) {
              TaskPlayAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 2.0, 1.0, -1, 14, 1.0, false, false, false);
            }
          }
        } else if (this.grabType == GrabState.Holding) {
          if (!IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbingDict, "base", 3)) {
            TaskPlayAnim(Game.PlayerPed.Handle, this.grabbingDict, "base", 2.0, 1.0, -1, 49, 1.0, false, false, false);
          }
        }
      }
    });
  }

  public stop(): void {
    if (this.grabbed && this.grabType == GrabState.Held) {
      DetachEntity(Game.PlayerPed.Handle, false, false);

      if (this.animTicks !== undefined) {
        clearTick(this.animTicks);
        this.animTicks = undefined;
      }

      if (IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 3)) {
        ClearPedTasks(Game.PlayerPed.Handle);
      }
    }
  }

  // Events
  private async EVENT_startGrabbing(grabbeeId: number): Promise<void> {
    const loadedAnim = await LoadAnim(this.grabbingDict);
    if (loadedAnim) {
      const playerStates = Player(this.client.player.NetworkId);
      this.grabbing = grabbeeId;
      this.grabType = GrabState.Holding;
      playerStates.state.grabState = GrabState.Holding;

      emitNet(JobEvents.grabPlayer, grabbeeId);

      this.grabbed = true;
      await PlayAnim(Game.PlayerPed, this.grabbingDict, "base", 49, -1, 2.0, 1.0, 1.0, false, false, false);
      this.startAnims();
    } else {
      console.log("COULDN'T LOAD GRABBED ANIM DICT 1!");
    }
  }

  private async EVENT_setGrabbed(grabbersId: number): Promise<void> {
    const grabbersPed = GetPlayerPed(GetPlayerFromServerId(grabbersId));
    if (grabbersPed > 0 && grabbersPed != Game.PlayerPed.Handle) {
      const loadedAnim = LoadAnim(this.grabbedDict);
      if (loadedAnim) {
        const playerStates = Player(grabbersId);
        this.grabbedBy = grabbersPed;

        AttachEntityToEntity(Game.PlayerPed.Handle, grabbersPed, 0, 0.2, 0.5, 0.0, 0.5, 0.5, 0, false, false, true, false, 2, false);

        playerStates.state.grabState = GrabState.Held;
        this.grabType = GrabState.Held;
        this.grabbed = true;
        this.startAnims();
      } else {
        console.log("COULDN'T LOAD GRABBED ANIM DICT 2!");
      }
    }
  }

  private async EVENT_stopGrabbing(): Promise<void> {
    if (this.grabbed) {
      const playerStates = Player(this.client.player.NetworkId);

      if (this.grabType == GrabState.Held) {
        DetachEntity(Game.PlayerPed.Handle, false, false);

        if (playerStates.state.cuffState == CuffState.Uncuffed) {
          if (IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbedDict, "idle", 3)) {
            ClearPedTasks(Game.PlayerPed.Handle);
          }
        }
      } else if (this.grabType == GrabState.Holding) {
        this.grabbing = undefined;

        if (IsEntityPlayingAnim(Game.PlayerPed.Handle, this.grabbingDict, "base", 3)) {
          ClearPedTasks(Game.PlayerPed.Handle);
        }
      }

      if (this.animTicks !== undefined) {
        clearTick(this.animTicks);
        this.animTicks = undefined;
      }

      this.grabbing = undefined;
      this.grabType = GrabState.None;
      playerStates.state.grabState = GrabState.None;
    }
  }
}
