import {Client} from "../../client";

import {FormattedWarning} from "../../models/ui/warning";

import {Events} from "../../../shared/enums/events";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {RegisterNuiCallback} from "../../utils";
import {Ranks} from "../../../shared/enums/ranks";

export class Warnings {
  private client: Client;
  private warnings: FormattedWarning[] = [];

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.receiveWarnings, this.EVENT_receiveWarnings.bind(this));

    // Nui Callbacks
    RegisterNuiCallback("CLOSE_WARNINGS", (data, cb) => {
      SetNuiFocus(false, false);
      cb("UNFOCUSED");
    });
  }

  // Events
  private async EVENT_receiveWarnings(myWarnings: FormattedWarning[]): Promise<void> {
    this.warnings = myWarnings;

    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.OpenWarnings,
      data: {
        warnings: this.warnings
      }
    }))
  }
}
