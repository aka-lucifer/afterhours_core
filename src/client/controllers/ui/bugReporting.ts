import { Inform, RegisterNuiCallback } from '../../utils';

import { Events } from '../../../shared/enums/events/events';
import { NuiCallbacks } from '../../../shared/enums/ui/nuiCallbacks';
import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { ServerCallback } from '../../models/serverCallback';
import { Callbacks } from '../../../shared/enums/events/callbacks';
import { Client } from '../../client';
import { Screen } from 'fivem-js';

export class BugReporting {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.startReporting, BugReporting.EVENT_startReporting.bind(this));

    Inform("Bug Reporting | UI Controller", "Started!");
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseBugReport, (data, cb) => {
      SetNuiFocus(false, false);
      cb("ok");
    });

    RegisterNuiCallback(NuiCallbacks.SubmitBug, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.submitBug, {
        type: data.type,
        description: data.description,
        reproduction: data.reproduction,
        evidence: data.evidence
      }, (cbData, passedData) => {
        SetNuiFocus(!cbData, !cbData);
        cb(cbData)
      }));
    });
  }

  public init(): void {
    this.registerCallbacks();
  }

  // Events
  private static EVENT_startReporting(): void {
    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.OpenBugReport
    }))
  }
}
