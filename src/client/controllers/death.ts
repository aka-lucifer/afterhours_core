import { Control, Game, InputMode, Ped, Vector3, Vehicle, VehicleSeat } from 'fivem-js';

import { Client } from '../client';
import { Delay, Inform, LoadAnim, teleportToCoords } from '../utils';

import { LXEvents } from '../../shared/enums/events/lxEvents';
import { DeathStates } from '../../shared/enums/deathStates';

import clientConfig from '../../configs/client.json';
import { NuiMessages } from '../../shared/enums/ui/nuiMessages';
import { Menu } from '../models/ui/menu/menu';
import { Events } from '../../shared/enums/events/events';
import { GameEvents } from '../../shared/enums/events/gameEvents';

interface KillerData {
  position: Vector3,
  vehName?: string,
  vehSeat?: VehicleSeat,
  weaponHash?: number,
  type: number,
  inVeh: boolean
}

enum UIState {
  Hidden = "hidden_HOE",
  Counting ="counting_down",
  Respawnable = "respawn_now"
}

export class Death {
  private client: Client;

  // Death Data
  public ejectedFromVeh: boolean = false;
  private myState: DeathStates = DeathStates.Alive;
  private blackedOut: boolean = false;

  // UI Data
  private respawnMenu: Menu;
  private UIState: UIState = UIState.Hidden;
  private defaultCountdown: number = clientConfig.controllers.death.defaultCountdownTimer;
  private countdownTimer: number;

  private defaultCounter: number = clientConfig.controllers.death.defaultRespawnCount
  private respawnCounter: number;

  // Ticks
  private deathTick: number = undefined;
  private animTick: number = undefined;
  private controlsTick: number = undefined;

  // UI Ticks
  private countdownTick: number = undefined;
  private respawnTick: number = undefined;

  constructor(client: Client) {
    this.client = client;
    this.countdownTimer = this.defaultCountdown; // Set the respawn timer to the default time on construct.
    this.respawnCounter = this.defaultCounter; // Set the respawn timer to the default time on construct.

    // NOTES
    // - Do ui of keybind [E] (Hold [E] for 5 seconds to respawn).

    // Events
    onNet(Events.gameEventTriggered, this.EVENT_entityDamaged.bind(this));
    onNet(Events.playerDead, this.EVENT_playerKilled.bind(this));
    onNet(Events.revive, this.EVENT_revive.bind(this));
    
    Inform("Death | Controller", "Started!");
  }

  // Getters
  public get Alive(): boolean {
    return this.myState === DeathStates.Alive;
  }

  // Events
  private EVENT_entityDamaged(eventName: string, eventArgs: any[]): void {
    if (eventName == GameEvents.entityDamaged) {
      const damagedEntity = eventArgs[0];

      if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
        const damagedPed = new Ped(damagedEntity);
        const isFatal = eventArgs[5];
        if (isFatal) {
          if (IsPedInAnyVehicle(damagedEntity, false)) {
            const vehSeat = this.getPedsVehSeat(damagedPed);
            emitNet(Events.playersDeath, true, vehSeat);
          } else {
            emitNet(Events.playersDeath, false);
          }
        }
      }
    }
  }

  private async EVENT_playerKilled(insideVeh: boolean, seat: VehicleSeat): Promise<void> {
    if (this.client.carrying.Carrying || this.client.carrying.Carrying) { // If you're carrying someone, detach them
      emitNet(Events.tryCarrying);
    }

    await this.processDeath(insideVeh, seat);
  }

  private async EVENT_revive(): Promise<void> {
    const myPed = Game.PlayerPed;
    const myPos = myPed.Position;

    NetworkResurrectLocalPlayer(myPos.x, myPos.y, myPos.z, myPed.Heading, true, false);
    myPed.clearBloodDamage();

    // const detachedWeapons = await this.client.weaponManager.onBack.clearWeapons(); // Remove all weapons from your player
    // if (detachedWeapons) {
    //   Game.PlayerPed.removeAllWeapons();
    // }

    // Hide the UI
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.DisplayDeath,
      data: {
        display: false,
        respawnCounter: this.defaultCountdown,
        holdCounter: this.defaultCounter
      }
    }));

    // Set your player state and godmode
    this.myState = DeathStates.Alive;
    // this.client.staffManager.staffMenu.toggleGodmode(false);

    // Reset variables back to default
    this.UIState = UIState.Hidden;
    this.countdownTimer = this.defaultCountdown; // Set the respawn timer to the default time
    this.respawnCounter = this.defaultCounter; // Set the respawn counter to the default time
    // Sync new info to UI

    // Delete ticks
    if (this.deathTick !== undefined) {
      clearTick(this.deathTick);
      this.deathTick = undefined;
    }

    if (this.controlsTick !== undefined) {
      clearTick(this.controlsTick);
      this.controlsTick = undefined;
    }

    if (this.animTick !== undefined) {
      clearTick(this.animTick);
      this.animTick = undefined;
    }

    if (this.countdownTick !== undefined) {
      clearTick(this.countdownTick);
      this.countdownTick = undefined;
    }

    if (this.respawnTick !== undefined) {
      clearTick(this.respawnTick);
      this.respawnTick = undefined;
    }
    
    console.log("data reset to", this.defaultCountdown, this.countdownTimer, this.defaultCounter, this.respawnCounter);
  }

  // Methods
  private registerExports(): void {
    global.exports("isDead", () => {
      return this.myState !== DeathStates.Alive; 
    });
  }

  private getPedsVehSeat(ped: Ped): VehicleSeat {
    if (IsPedInAnyVehicle(ped.Handle, false)) {
      const currVeh = ped.CurrentVehicle;
      const maxPassengers = GetVehicleMaxNumberOfPassengers(currVeh.Handle);
      for (let i = -2; i < maxPassengers; i++) {
        if (currVeh.getPedOnSeat(i).Handle == ped.Handle) {
          return i;
        }
      }
    }

    return VehicleSeat.None;
  }
  
  public async init(): Promise<void> {
    this.registerExports();

    // make menu
    this.respawnMenu = new Menu("Respawn Menu", GetCurrentResourceName(), "middle-right");
    const positions = clientConfig.controllers.death.respawnPositions;
    for (let i = 0; i < positions.length; i++) {
      this.respawnMenu.BindButton(positions[i].label, async() => {
        await this.respawnMenu.Close();
        const myPed = Game.PlayerPed;

        const teleported = await teleportToCoords(new Vector3(positions[i].x, positions[i].y, positions[i].z), true, positions[i].heading);
        if (teleported) {
          NetworkResurrectLocalPlayer(positions[i].x, positions[i].y, positions[i].z, positions[i].heading, true, false);
          myPed.clearBloodDamage();

          this.myState = DeathStates.Alive;
          // this.client.staffManager.staffMenu.toggleGodmode(false);
          // const detachedWeapons = await this.client.weaponManager.onBack.clearWeapons(); // Remove all weapons from your player
          // if (detachedWeapons) {
          //   Game.PlayerPed.removeAllWeapons();
          // }

          // Disable Ticks
          if (this.deathTick !== undefined) {
            clearTick(this.deathTick);
            this.deathTick = undefined;
          }

          if (this.controlsTick !== undefined) {
            clearTick(this.controlsTick);
            this.controlsTick = undefined;
          }

          if (this.animTick !== undefined) {
            clearTick(this.animTick);
            this.animTick = undefined;
          }
        }
      });
    }

    await this.setup();
  }

  private async setup(): Promise<boolean> {
    const loadedAnim1 = await LoadAnim("dead");
    const loadedAnim2 = await LoadAnim("veh@low@front_ps@idle_duck");

    return loadedAnim1 && loadedAnim2;
  }

  private async blackout(): Promise<boolean> {
    if (!this.blackedOut) {
      DoScreenFadeOut(0);
      while (!IsScreenFadedOut()) {
        await Delay(0);
      }

      return true;
    } else {
      return true;
    }
  }

  private async processDeath(insideVeh: boolean, vehSeat: VehicleSeat): Promise<void> {
    const loadedAnims = await this.setup(); // Make sure our death animations are loaded
    if (loadedAnims) {
      this.blackedOut = await this.blackout();
      if (this.blackedOut) {
        this.blackedOut = false;

        // Wait 2 seconds after you black out when you die, then fade back in.
        await Delay(1500);
        DoScreenFadeIn(1000);

        if (this.deathTick === undefined) this.deathTick = setTick(async () => {
          const myPed = Game.PlayerPed;

          if (myPed.isDead()) {
            const playerStates = Player(this.client.Player.NetworkId);

            // Set you to dead
            if (this.myState === DeathStates.Alive) {
              // Make you alive again
              const myPos = myPed.Position;
              NetworkResurrectLocalPlayer(myPos.x, myPos.y, myPos.z, myPed.Heading, true, false);
              myPed.clearBloodDamage();
              // this.client.staffManager.staffMenu.toggleGodmode(true);

              // Set you as dead
              // playerStates.state.deathState = DeathStates.Dead;
              this.myState = DeathStates.Dead;

              // Play dead animations
              if (insideVeh) { // Have to check this way, as `IsPedInAnyVehicle` is ran too late
                const veh = myPed.LastVehicle;
                while (veh.Speed > 0.5 || IsPedRagdoll(myPed.Handle)) { // Wait until our vehicle has stopped, or we've stopped ragdolling (seatbelt)
                  await Delay(10);
                }

                myPed.setIntoVehicle(veh, vehSeat);
                TaskPlayAnim(myPed.Handle, "veh@low@front_ps@idle_duck", "sit", 2.0, 2.0, -1, 51, 0, false, false, false);
              } else {
                TaskPlayAnim(myPed.Handle, "dead", "dead_a", 1,.0, 1.0, 14, 0, false, false, false);
              }

              // Reset Vehicle Data

              // Force anims to be persistent
              this.deathAnims();

              // Disable controls here
              this.disableControls();

              // Start UI here and UI tick (countdown -> 5 sec key hold)
              if (this.UIState == UIState.Hidden) {
                this.UIState = UIState.Counting;

                SendNuiMessage(JSON.stringify({
                  event: NuiMessages.DisplayDeath,
                  data: {
                    type: this.UIState,
                    display: true,
                    respawnRemaining: this.countdownTimer
                  }
                }))

                this.startCountdown();
              }
            } else {
              if (playerStates.state.deathState === DeathStates.Dead) {
                if (myPed.isDead()) {
                  // Make you alive again
                  const myPos = myPed.Position;
                  NetworkResurrectLocalPlayer(myPos.x, myPos.y, myPos.z, myPed.Heading, true, false);
                  myPed.clearBloodDamage();
                  // this.client.staffManager.staffMenu.toggleGodmode(true);

                  // Set you as dead
                  // playerStates.state.deathState = DeathStates.Dead;
                  this.myState = DeathStates.Dead;

                  // Play dead animations
                  if (insideVeh) { // Have to check this way, as `IsPedInAnyVehicle` is ran too latecurrVeh
                    const veh = myPed.LastVehicle;
                    while (veh.Speed > 0.5 || IsPedRagdoll(myPed.Handle)) { // Wait until our vehicle has stopped, or we've stopped ragdolling (seatbelt)
                      await Delay(10);
                    }

                    myPed.setIntoVehicle(veh, vehSeat);
                    TaskPlayAnim(myPed.Handle, "veh@low@front_ps@idle_duck", "sit", 2.0, 2.0, -1, 51, 0, false, false, false);
                  } else {
                    TaskPlayAnim(myPed.Handle, "dead", "dead_a", 1,.0, 1.0, 14, 0, false, false, false);
                  }
                }
              }
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        });
      }
    }
  }

  private disableControls(): void {
    if (this.controlsTick === undefined) this.controlsTick = setTick(() => {
      const playerStates = Player(this.client.Player.NetworkId);
      if (playerStates.state.deathState == DeathStates.Dead) {
        const controlsToDisable = clientConfig.controllers.death.disabledControls;

        for (let i = 0; i < controlsToDisable.length; i++) {
          Game.disableControlThisFrame(InputMode.MouseAndKeyboard, controlsToDisable[i]);
        }
      }
    });
  }

  private deathAnims(): void {
    if (this.animTick === undefined) this.animTick = setTick(() => {
      const playerStates = Player(this.client.Player.NetworkId);

      if (playerStates.state.deathState == DeathStates.Dead) {
        const myPed = Game.PlayerPed;

        if (!IsPedInAnyVehicle(myPed.Handle, false)) {
          if (!IsEntityPlayingAnim(myPed.Handle, "dead", "dead_a", 3)) {
            TaskPlayAnim(myPed.Handle, "dead", "dead_a", 1.0, 1.0, -1, 14, 0, false, false, false);
          }
        } else {
          if (!IsEntityPlayingAnim(myPed.Handle, "veh@low@front_ps@idle_duck", "sit", 3)) {
            TaskPlayAnim(myPed.Handle, "veh@low@front_ps@idle_duck", "sit", 2.0, 2.0, -1, 51, 0, false, false, false);
          }
        }
      }
    });
  }

  private startCountdown(): void {
    if (this.countdownTick === undefined) this.countdownTick = setTick(async() => {
      if (this.countdownTimer > 0) { // If the timer is greater than zero, wait one second inbetween
        await Delay(1000);
      }

      if ((this.countdownTimer - 1) >= 0) {
        this.countdownTimer--;

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.UpdateRespawnTimer,
          data: {
            newTimer: this.countdownTimer
          }
        }));
      } else {
        if (this.countdownTick !== undefined) { // Clear countdown tick
          clearTick(this.countdownTick);
          this.countdownTick = undefined;

          this.countdownTimer = this.defaultCountdown; // Reset the respawn countdown back to the default

          this.startRespawnTimer(); // Start respawn input hold shit ting!
        }
      }
    });
  }

  private startRespawnTimer(): void {
    if (this.respawnTick === undefined) this.respawnTick = setTick(async() => {
      if (this.UIState == UIState.Counting) {
        this.UIState = UIState.Respawnable;

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.StartRespawnable,
          data: {
            type: this.UIState,
            counter: this.respawnCounter
          }
        }))
      }

      if (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Context)) {
        if ((this.respawnCounter - 1) >= 0) {
          this.respawnCounter--;

          SendNuiMessage(JSON.stringify({
            event: NuiMessages.UpdateRespawnCounter,
            data: {
              newCounter: this.respawnCounter
            }
          }));
        } else {
          if (this.respawnTick !== undefined) {
            // Clear the tick
            clearTick(this.respawnTick);
            this.respawnTick = undefined;

            // Hide the UI
            SendNuiMessage(JSON.stringify({
              event: NuiMessages.DisplayDeath,
              data: {
                display: false
              }
            }));

            // Reset variables back to default
            this.UIState = UIState.Hidden;
            this.countdownTimer = this.defaultCountdown; // Set the respawn timer to the default time
            this.respawnCounter = this.defaultCounter; // Set the respawn counter to the default time

            await this.respawnMenu.Open();
          }
        }

        if (this.respawnCounter > 0) { // If the timer is greater than zero, wait one second inbetween
          await Delay(1000);
        }
      } else { // If we have stopped holding E
        if (this.respawnCounter < this.defaultCounter) { // If our counter is less than the default, update it and send that to the UI
          this.respawnCounter = this.defaultCounter;

          SendNuiMessage(JSON.stringify({
            event: NuiMessages.UpdateRespawnCounter,
            data: {
              newCounter: this.respawnCounter
            }
          }));
        }
      }
    })
  }
}
