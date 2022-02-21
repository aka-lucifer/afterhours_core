import {Client} from "../../client";

import {FormattedCommend} from "../../models/ui/commend";

import {Events} from "../../../shared/enums/events";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {RegisterNuiCallback} from "../../utils";

export class Commends {
  private client: Client;
  private commends: FormattedCommend[] = [];

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.receiveCommends, this.EVENT_receiveCommends.bind(this));

    // Nui Callbacks
    RegisterNuiCallback("CLOSE_COMMENDS", (data, cb) => {
      SetNuiFocus(false, false);
      cb("UNFOCUSED");
    });
  }

  // Events
  private async EVENT_receiveCommends(myCommends: FormattedCommend[]): Promise<void> {
    this.commends = myCommends;

    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.OpenCommends,
      data: {
        commends: this.commends
      }
    }))
  }
}
