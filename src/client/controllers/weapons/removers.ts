import { Game } from "fivem-js";
import { Events } from "../../../shared/enums/events/events";
import { Weapons } from "../../../shared/enums/weapons";

import { Client } from "../../client";
import { Delay } from "../../utils";

export class WeaponRemovers {
  private client: Client;

  private currentWeapon: number;
  private changedWeapon: boolean = false;
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
          // console.log("diff weapon!")
          this.currentWeapon = currWeapon; // Set new weapon
          this.changedWeapon = true; // Set changed our weapon to true
        }
      }

      if (this.changedWeapon) {
        // console.log("mandem changed his weapon init bruv!");
        emitNet(Events.checkWeapon, this.currentWeapon);
        this.changedWeapon = false;
      }

      // await Delay(500);
    });


  }

  public stop(): void {
    if (this.changeTick !== undefined) {
      clearTick(this.changeTick);
      this.changeTick = undefined;
    }
  }
}