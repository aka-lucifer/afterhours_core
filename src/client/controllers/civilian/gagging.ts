import { Game, Model, Prop, World } from "fivem-js";
import { Events } from "../../../shared/enums/events/events";

import { Client } from "../../client";

export class Gagging {
  private client: Client;

  private mouthGagged: boolean = false;
  private sockProp: Prop;

  constructor(client: Client) {
    this.client = client;
    
    // Events
    onNet(Events.gagPlayer, this.EVENT_gagPlayer.bind(this));
  }

  // Events
  private async EVENT_gagPlayer(): Promise<void> {
    if (!this.mouthGagged) {
      this.mouthGagged = true;

      const model = new Model("prop_rolled_sock_01");
      const modelLoaded = await model.request(2000);
      if (modelLoaded) {
        model.markAsNoLongerNeeded();
        
        const myPed = Game.PlayerPed;
        this.sockProp = await World.createProp(model, myPed.Position, false, true);
        AttachEntityToEntity(this.sockProp.Handle, myPed.Handle, GetPedBoneIndex(PlayerPedId(), 19336), -0.01, -0.02, -0.06, 0.0, 0.0, 0.0, true, true, false, false, 1, true);
      }
    } else {
      this.mouthGagged = false;
      if (this.sockProp !== undefined) {
        if (this.sockProp.Handle > 0) {
          if (this.sockProp.exists()) {
            this.sockProp.delete();
            this.sockProp = undefined;
          }
        }
      }
    }
  }
}