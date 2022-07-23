import { Control, Game, InputMode } from 'fivem-js';

import { Client } from '../../client';
import { Delay, Inform } from '../../utils';

import { Weapons } from '../../../shared/enums/weapons';

import clientConfig from '../../../configs/client.json';

export class WeaponDisablers {
  private client: Client;

  private rollTick: number = undefined;
  private punchTick: number = undefined;
  private punchControlTick: number = undefined;
  private stanceFixerTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Weapon | Disablers Controller", "Started!");
  }

  // Getters
  public get RollActive(): boolean {
    return this.rollTick !== undefined;
  }

  public get PunchActive(): boolean {
    return this.punchTick !== undefined;
  }

  // Methods
  public start(): void {
    if (this.stanceFixerTick === undefined) this.stanceFixerTick = setTick(async() => {
      if (IsPedUsingActionMode(Game.PlayerPed.Handle)) {
        SetPedUsingActionMode(Game.PlayerPed.Handle, false, -1, "DEFAULT_ACTION");
      } else {
        await Delay(500);
      }
    });

    this.startPunch(); // Have to start it manually, however it will be managed by "removers.ts"
  }

  public startRoll(): void {
    // Disable Combat Roll
    if (this.rollTick === undefined) this.rollTick = setTick(async() => {
      const myPed = Game.PlayerPed;

      if (IsPedOnFoot(myPed.Handle)) {
        const currWeapon = GetSelectedPedWeapon(myPed.Handle);
        if (currWeapon !== Weapons.Unarmed) {
          if (IsPedArmed(myPed.Handle, 2 | 4)) {
            if (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Aim)) { // If aim held
              Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Jump);
            }
          }
        }
      } else {
        await Delay(500);
      }
    });
  }

  public stopRoll(): void {
    if (this.rollTick !== undefined) {
      clearTick(this.rollTick);
      this.rollTick = undefined;
    }
  }

  public startPunch(): void { // Will use 0.02ms
    // Disable Punch Spammer
    if (this.punchTick === undefined) this.punchTick = setTick(async() => {
      if (this.client.death.Alive) {
        const myPed = Game.PlayerPed;
        if (IsPedOnFoot(Game.PlayerPed.Handle)) {
          // If we're unarmed
          if (GetSelectedPedWeapon(myPed.Handle) === Weapons.Unarmed) {
            if (
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Attack) ||
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MeleeAttackLight) ||
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MeleeAttackHeavy) ||
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MeleeAttackAlternate) ||
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MeleeAttack1) ||
              Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MeleeAttack2)) { // If punched
              // console.log("hit control");

              if (this.punchControlTick === undefined) {
                this.punchControlTick = setTick(async () => {
                  // console.log("disable controls!");
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Attack);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Attack2);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttack1);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttack2);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttackAlternate);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttackHeavy);
                  Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.MeleeAttackLight);
                });

                setTimeout(() => {
                  clearTick(this.punchControlTick);
                  this.punchControlTick = undefined;
                }, clientConfig.controllers.weapons.disablers.antiPunch.time);
              }
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
    });
  }

  public stopPunch(): void {
    if (this.punchTick !== undefined) {
      clearTick(this.punchTick);
      this.punchTick = undefined;

      if (this.punchControlTick !== undefined) {
        clearTick(this.punchControlTick);
        this.punchControlTick = undefined;
      }
    }
  }
}
