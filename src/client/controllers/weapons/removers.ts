import { Game } from "fivem-js";
import { Events } from "../../../shared/enums/events/events";
import { Weapons } from "../../../shared/enums/weapons";

import { Client } from "../../client";
import { Delay } from "../../utils";

export class WeaponRemovers {
  private client: Client;

  private currentWeapon: number;
  private changedWeapon: boolean = false;
  private rollArmed: boolean = false;
  private changeTick: number;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public start(): void {
    // console.log("start tick!");
    if (this.changeTick === undefined) this.changeTick = setTick(async() => {
      
      if (this.currentWeapon === undefined) { // If our current weapon is unassigned
        this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
      } else { // If it is assigned check if it's different
        const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
        if (currWeapon !== this.currentWeapon) {
          this.rollArmed = IsPedArmed(Game.PlayerPed.Handle, 2 | 4);
          console.log("set roll armed to", this.rollArmed)
          // console.log("diff weapon!")
          this.currentWeapon = currWeapon; // Set new weapon
          this.changedWeapon = true; // Set changed our weapon to true
        }
      }

      if (this.changedWeapon) {
        // console.log("mandem changed his weapon init bruv!");
        emitNet(Events.checkWeapon, this.currentWeapon);
        this.changedWeapon = false;
        
        // [ANTI COMBAT ROLE]
        // If the weapon is a roll weapon
        if (this.rollArmed) {
          // If the combat roll disabler tick isn't running, and we're armed with a roll weapon, start it
          if (!this.client.weaponDisablers.RollActive) {
            await Delay(200); // Wait 0.2 seconds as we may not have access to this weapon, due to our rank

            // If the weapon is still on our ped
            if (GetSelectedPedWeapon(Game.PlayerPed.Handle) !== Weapons.Unarmed) {
              this.client.weaponDisablers.startRoll();
            }
          }
        } else {
          // If the combat roll disabler tick is running
          if (this.client.weaponDisablers.RollActive) {
            this.client.weaponDisablers.stopRoll();
          }
        }
      }

      await Delay(500);
    });


  }

  public stop(): void {
    if (this.changeTick !== undefined) {
      clearTick(this.changeTick);
      this.changeTick = undefined;
    }
  }
}