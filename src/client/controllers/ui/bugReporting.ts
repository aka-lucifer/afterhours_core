import { Inform, RegisterNuiCallback } from '../../utils';
import { Client } from '../../client';

import { Events } from '../../../shared/enums/events/events';
import { NuiCallbacks } from '../../../shared/enums/ui/nuiCallbacks';
import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { Callbacks } from '../../../shared/enums/events/callbacks';

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
      this.client.cbManager.TriggerServerCallback(Callbacks.submitBug, (returnedData: any) => {
        SetNuiFocus(!returnedData, !returnedData);
        cb(returnedData)
      }, {
        type: data.type,
        description: data.description,
        reproduction: data.reproduction,
        evidence: data.evidence
      });
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
