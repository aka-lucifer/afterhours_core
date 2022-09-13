import {Game} from "fivem-js";

import {Delay, Inform, LoadAnim, PlayAnim} from "../../utils";
import {Client} from "../../client";

import {Notification} from "../../models/ui/notification";

import {Events} from "../../../shared/enums/events/events";
import {SurrenderState} from "../../../shared/enums/surrenderState";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";

export class Surrending {
  private client: Client;
  
  private surrenderState: SurrenderState = SurrenderState.Down;
  private controlTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.toggleHands, this.EVENT_toggleHands.bind(this));
    onNet(Events.startKneeling, this.EVENT_startKneeling.bind(this));

    // Keybindings
    RegisterCommand("+toggle_hands", this.EVENT_toggleHands.bind(this), false);

    Inform("Surrending | Civilian Controller", "Started!");
  }

  // Events
  private async EVENT_toggleHands(toggleState: boolean = undefined): Promise<void> {
    const playerStates = Player(this.client.Player.NetworkId);

    if (this.surrenderState === SurrenderState.Down || toggleState !== undefined && toggleState) {
      // console.log("put hands up");

      if (this.surrenderState === SurrenderState.Kneeling || this.surrenderState === SurrenderState.Kneeled) {
        const notification = new Notification("Surrendering", "You can't put your hands up whilst already kneeling!", NotificationTypes.Error);
        await notification.send();
        return;
      }

      const myPed = Game.PlayerPed;
      const loadedAnim = await LoadAnim("rcmminute2");
      if (loadedAnim) {
        // if (IsPedInAnyVehicle(myPed.Handle, false)) ClearPedTasksImmediately(myPed.Handle);
        const playingAnim = await PlayAnim(myPed, "rcmminute2", "arrest_walk", 49, -1, 2.0, 1.0, 1.0, false, false, false) || IsEntityPlayingAnim(myPed.Handle, "rcmminute2", "arrest_walk", 3); // Play it or return true if we already are
        if (playingAnim) {
          this.surrenderState = SurrenderState.Up;
          playerStates.state.surrenderState = SurrenderState.Up;
          if (this.controlTick === undefined) this.disableControls();
        }
      }
    } else {
      const myPed = Game.PlayerPed;

      if (this.surrenderState === SurrenderState.Up) { // Hands Down
        // console.log("put hands down!");
        StopAnimTask(myPed.Handle, "rcmminute2", "arrest_walk", 1.0);
        this.surrenderState = SurrenderState.Down;
        playerStates.state.surrenderState = SurrenderState.Down;
        if (this.controlTick !== undefined) this.stopControlDisabler();
      } else if (this.surrenderState === SurrenderState.Kneeling || this.surrenderState === SurrenderState.Kneeled) { // Stop Kneeling
        // console.log("stop kneeling");
        const loadedAnim = await LoadAnim("random@arrests@busted");
        if (loadedAnim) {
          // if (IsPedInAnyVehicle(myPed.Handle, false)) ClearPedTasksImmediately(myPed.Handle);
          const playingIntro = await PlayAnim(myPed, "random@arrests@busted", "exit", 2, -1, 8.0, 1.0, 0, false, false, false) || IsEntityPlayingAnim(myPed.Handle, "random@arrests@busted", "exit", 3); // Play it or return true if we already are
          if (playingIntro) {
            await Delay(3000);
            const playingIdle = await PlayAnim(myPed, "random@arrests", "kneeling_arrest_get_up", 2, -1, 8.0, 1.0, 0, false, false, false) || IsEntityPlayingAnim(myPed.Handle, "random@arrests", "kneeling_arrest_get_up", 3); // Play it or return true if we already are
            if (playingIdle) {
              await Delay(2000);
              ClearPedTasks(myPed.Handle);
              this.surrenderState = SurrenderState.Down;
              playerStates.state.surrenderState = SurrenderState.Down;
              if (this.controlTick !== undefined) this.stopControlDisabler();
            }
          }
        }
      }
    }
  }
  
  private async EVENT_startKneeling(): Promise<void> {
    const playerStates = Player(this.client.Player.NetworkId);

    if (this.surrenderState !== SurrenderState.Kneeling && this.surrenderState !== SurrenderState.Kneeled) {
      const myPed = Game.PlayerPed;

      if (!IsPedInAnyVehicle(myPed.Handle, false)) {
        const loadedAnim = await LoadAnim("random@arrests");
        if (loadedAnim) {
          // if (IsPedInAnyVehicle(myPed.Handle, false)) ClearPedTasksImmediately(myPed.Handle);
          const playingIntro = await PlayAnim(myPed, "random@arrests", "idle_2_hands_up", 2, -1, 8.0, 1.0, 0, false, false, false) || IsEntityPlayingAnim(myPed.Handle, "random@arrests", "idle_2_hands_up", 3); // Play it or return true if we already are
          if (playingIntro) {
            this.surrenderState = SurrenderState.Kneeling;
            playerStates.state.surrenderState = SurrenderState.Kneeling;
            if (this.controlTick === undefined) this.disableControls();
            await Delay(4000);
            if (this.surrenderState === SurrenderState.Kneeling) { // If we're still kneeling
              const playingIdle = await PlayAnim(myPed, "random@arrests", "kneeling_arrest_idle", 2, -1, 8.0, 1.0, 0, false, false, false) || IsEntityPlayingAnim(myPed.Handle, "random@arrests", "kneeling_arrest_idle", 3); // Play it or return true if we already are
              if (playingIdle) {
                this.surrenderState = SurrenderState.Kneeled;
                playerStates.state.surrenderState = SurrenderState.Kneeled;
              }
            }
          }
        }
      } else {
        const notification = new Notification("Surrendering", "You can't kneel inside a vehicle!", NotificationTypes.Error);
        await notification.send();
      }
    } else {
      const notification = new Notification("Surrendering", "You are already kneeling!", NotificationTypes.Error);
      await notification.send();
    }
  }

  private disableControls(): void {
    if (this.controlTick === undefined) this.controlTick = setTick(async() => {
      if (this.surrenderState === SurrenderState.Up || this.surrenderState === SurrenderState.Kneeling || this.surrenderState === SurrenderState.Kneeled) {
        const myPed = Game.PlayerPed;
        if (IsPedInAnyVehicle(myPed.Handle, false)) {
          Game.disableControlThisFrame(0, 24); // Attack
          Game.disableControlThisFrame(0, 257); // Attack 2
          Game.disableControlThisFrame(0, 71); // Accelerate
          Game.disableControlThisFrame(0, 72); // Brake/Reverse
          Game.disableControlThisFrame(0, 74); // Headlight
          Game.disableControlThisFrame(0, 63); // Steer l
          Game.disableControlThisFrame(0, 64); // Steer r
          Game.disableControlThisFrame(0, 59); // Steer r
          Game.disableControlThisFrame(0, 278); // Steer r
          Game.disableControlThisFrame(0, 279); // Steer r
          Game.disableControlThisFrame(0, 68); // Driveby aim
          Game.disableControlThisFrame(0, 69); // Driveby fire_flames
          Game.disableControlThisFrame(0, 76); // Handbrake
          Game.disableControlThisFrame(0, 102); // Handbrake		
          Game.disableControlThisFrame(0, 81); // Radio Next
          Game.disableControlThisFrame(0, 82); // Radio Previous
          Game.disableControlThisFrame(0, 83); // Radio PC Next
          Game.disableControlThisFrame(0, 84); // Radio PC Previous
          Game.disableControlThisFrame(0, 85); // Radio Wheel 
          Game.disableControlThisFrame(0, 86); // Horn
          Game.disableControlThisFrame(0, 106); // Mouse Drive
          Game.disableControlThisFrame(0, 102); // Veh Jump
          Game.disableControlThisFrame(0, 23); // Enter Veh
        } else {
          Game.disableControlThisFrame(0, 24); // Attack
					Game.disableControlThisFrame(0, 257); // Attack 2
					Game.disableControlThisFrame(0, 22); // Jump
					Game.disableControlThisFrame(0, 24); // Fire_flames
					Game.disableControlThisFrame(0, 25); // Aim
					Game.disableControlThisFrame(0, 36); // Stealth
					Game.disableControlThisFrame(0, 45); // Reload
					Game.disableControlThisFrame(0, 47); // Detonate Grenade
          Game.disableControlThisFrame(0, 23); // Enter vehicle (if not inside a vehicle)
					Game.disableControlThisFrame(0, 140); // Melee Light
					Game.disableControlThisFrame(0, 141); // Melee Heavy
					Game.disableControlThisFrame(0, 143); // melee Dodge
					Game.disableControlThisFrame(0, 142); // Attack Alternative
        }

        // Handles cancelling if no longer doing anims
        if (this.surrenderState === SurrenderState.Up) {
          const playingAnim = IsEntityPlayingAnim(myPed.Handle, "rcmminute2", "arrest_walk", 3);
          if (!playingAnim) { // If no longer playing the anim, cancel everything
            // console.log("No longer playing hands up anim, cancel the controls tick and clear your surrender state!");
            const playerStates = Player(this.client.Player.NetworkId);
            this.stopControlDisabler();
            this.surrenderState = SurrenderState.Down;
            playerStates.state.surrenderState = SurrenderState.Down;
          }
        } else if (this.surrenderState === SurrenderState.Kneeling || this.surrenderState === SurrenderState.Kneeled) {
          const playingAnim = IsEntityPlayingAnim(myPed.Handle, "random@arrests", "idle_2_hands_up", 3)
            || IsEntityPlayingAnim(myPed.Handle, "random@arrests", "kneeling_arrest_idle", 3); // If playing intro or idle kneel anim
          if (!playingAnim) { // If no longer playing the anim, cancel everything
            // console.log("No longer playing kneel anim, cancel the controls tick and clear your surrender state!");
            const playerStates = Player(this.client.Player.NetworkId);
            this.stopControlDisabler();
            this.surrenderState = SurrenderState.Down;
            playerStates.state.surrenderState = SurrenderState.Down;
          }
        }
      } else {
        await Delay(1000);
      }
    });
  }

  public stopControlDisabler(): void {
    if (this.controlTick !== undefined) {
      clearTick(this.controlTick);
      this.controlTick = undefined;

      if (this.surrenderState !== SurrenderState.Down) {
        const playerStates = Player(this.client.Player.NetworkId);
        this.surrenderState = SurrenderState.Down;
        playerStates.state.surrenderState = SurrenderState.Down;
      }
    }
  }
}
