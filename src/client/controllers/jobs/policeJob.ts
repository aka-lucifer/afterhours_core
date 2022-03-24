import { Vector3 } from "fivem-js";

import { Client } from "../../client";

import { Jobs } from "../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../shared/enums/events/jobEvents";

export class PoliceJob {
  private client: Client

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public registerBoxZones(): void {
    emit("astrid_target:client:addBoxZone", "Sandy PD", new Vector3(1852.24, 3687.0, 34.27), 2.4, 1.4, {
      name: "sandy_pd PD",
      heading: 301,
      debugPoly: false,
      minZ: 32.95,
      maxZ: 36.95
    }, {
      options: [
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-sign-in-alt",
          label: "Sign In",
          job: Jobs.Police,
          state: true
        },
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-sign-out-alt",
          label: "Sign Out",
          job: Jobs.Police,
          state: false
        },
      ],
      distance: 3.5
    });
  }

  public init(): void {
    this.registerBoxZones();
  }
}