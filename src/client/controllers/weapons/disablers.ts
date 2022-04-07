import { Control, Game, InputMode, Ped } from "fivem-js";

import { Delay } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { Weapons } from "../../../shared/enums/weapons";

export class WeaponDisablers {
  private rollTick: number = undefined;
  private stanceFixerTick: number = undefined;

  constructor() {

    // Events
    onNet(Events.gameEventTriggered, this.gameEvent.bind(this));
  }

  // Getters
  public get RollActive(): boolean {
    return this.rollTick !== undefined;
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
  }

  public startRoll(): void {
    // Disable Combat Roll
    if (this.rollTick === undefined) this.rollTick = setTick(async() => {
      if (IsPedArmed(Game.PlayerPed.Handle, 2 | 4)) {
        if (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Aim)) { // If aim held
          Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.Jump);
        }
      }
    });
  }

  public stopRoll(): void {
    if (this.rollTick !== undefined) {
      clearTick(this.rollTick);
      this.rollTick = undefined;
    }
  }

  // Events
  private async gameEvent(eventName: string, eventArgs: any[]): Promise<void> {
    if (eventName == "CEventNetworkEntityDamage") {
      const attackingEntity = new Ped(eventArgs[0]);
      if (attackingEntity.IsPlayer) {
        const isMelee = eventArgs[11];
        if (isMelee) {
          const weaponHash = eventArgs[6];
          if (weaponHash == Weapons.Unarmed) {
            console.log("person punched you!");
          }
        }
      }
    }
  }
}