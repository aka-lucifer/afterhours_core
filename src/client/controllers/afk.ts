import { Vector3, Game, Ped, VehicleSeat, InputMode, Control } from "fivem-js";

import { Client } from "../client";
import { Delay } from "../utils";

import { Events } from "../../shared/enums/events/events";
import { Message } from "../../shared/models/ui/chat/message";
import { SystemTypes } from "../../shared/enums/ui/chat/types";

export class AFK {
  // Client Data
  private client: Client;

  // AFK Data
  private manuallySet: boolean = false;
  private movementTick: number = undefined;
  private afkInterval: NodeJS.Timeout;

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.startAFK();

    // Events
    onNet(Events.setAFK, this.EVENT_setAFK.bind(this));
  }

  // Methods
  private startAFK(): void {
    // this.afkInterval = setInterval(() => {
      // if (this.client.Player.Spawned) {
        console.log("AFK TIMER!");
      // }
    // }, 5000);
  }

  // Events
  private EVENT_setAFK(manually?: boolean): void {
    if (this.client.Player.Spawned) {
      if (manually) this.manuallySet = true;
      this.client.playerStates.state.afk = true;
      
      if (this.movementTick == undefined) this.movementTick = setTick(() => {
        if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.MoveUpOnly) || Game.isControlPressed(InputMode.MouseAndKeyboard, Control.MoveUpOnly)) {
          if (this.client.playerStates.state.afk) {
            console.log("MOVED FORWARD WHILST AFK!");
            this.client.playerStates.state.afk = false;
            emit(Events.sendSystemMessage, new Message("You're no longer AFK.", SystemTypes.Action));

            clearTick(this.movementTick);
            this.movementTick = undefined;
          }
        }
      });
    }
  }
}