import { Bone, Control, Game, InputMode, Model, Prop, World } from "fivem-js";
import { Events } from "../../../shared/enums/events/events";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";

import { Client } from "../../client";
import { Inform } from "../../utils";

export class Kidnapping {
  private client: Client;

  private kidnapBag: Prop = undefined;
  private tick: number = undefined;

  constructor(client: Client) {
    this.client = client;
    
    RegisterCommand("kidnap_player", () => emitNet(Events.tryKidnapping), false);

    // Events
    onNet(Events.kidnapPlayer, this.EVENT_kidnapPlayer.bind(this));

    Inform("Kidnapping | Civilian Controller", "Started!");
  }

  // Events
  private async EVENT_kidnapPlayer(toggler: boolean): Promise<void> {
    if (toggler) {
      // Delete kidnap bag if it already exists
      if (this.kidnapBag !== undefined) {
        if (this.kidnapBag.Handle > 0) {
          if (this.kidnapBag.exists()) {
            this.kidnapBag.delete();
            this.kidnapBag = undefined;
          }
        }
      }

      const myPed = Game.PlayerPed;

      this.kidnapBag = await World.createProp(new Model("prop_cs_sack_01"), myPed.Position, true, true);
      AttachEntityToEntity(this.kidnapBag.Handle, myPed.Handle, GetPedBoneIndex(myPed.Handle, Bone.SKEL_Neck_1), 0.1, 0.0, 0.005, 270.0, 180.0, 75.0, false, false, false, false, 0, true);
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.KidnapPlayer,
        data: {
          toggle: true
        }
      }));

      if (this.tick === undefined) this.tick = setTick(() => {
        Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.FrontendPause);
        Game.disableControlThisFrame(InputMode.MouseAndKeyboard, Control.FrontendPauseAlternate);
      })
    } else {
      // Delete kidnap bag
      if (this.kidnapBag !== undefined) {
        if (this.kidnapBag.Handle > 0) {
          if (this.kidnapBag.exists()) {
            this.kidnapBag.delete();
            this.kidnapBag = undefined;

            if (this.tick !== undefined) {
              clearTick(this.tick);
              this.tick = undefined;
            }

            SendNuiMessage(JSON.stringify({
              event: NuiMessages.KidnapPlayer,
              data: {
                toggle: false
              }
            }));
          }
        }
      }
    }
  }
}