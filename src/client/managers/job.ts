import { Capitalize } from "../utils";
import { Client } from "../client";

import { Notification } from "../models/ui/notification";

import { JobEvents } from "../../shared/enums/events/jobEvents";

// Jobs
import { PoliceJob } from "../controllers/jobs/policeJob";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";

export class JobManager {
  private client: Client;

  // Jobs
  private policeJob: PoliceJob;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.toggleDuty, this.EVENT_toggleDuty.bind(this));
  }

  // Methods
  public init(): void {
    this.policeJob = new PoliceJob(this.client);
    this.policeJob.init();
  }

  // Events
  public async EVENT_toggleDuty(data: Record<string, any>): Promise<void> {
    if (this.client.Character.Job.Status != data.state) {
      this.client.Character.Job.Status = data.state;
      console.log("Set Duty", Capitalize(this.client.Character.Job.Status.toString()));
      emitNet(JobEvents.setDuty, data.state);
      
      if (data.state) {
        const notify = new Notification("Job", `You've gone on duty!`, NotificationTypes.Success);
        await notify.send();
      } else {
        const notify = new Notification("Job", `You've gone off duty!`, NotificationTypes.Success);
        await notify.send();
      }
    } else {
      if (data.state) {
        const notify = new Notification("Job", `You are already on duty!`, NotificationTypes.Error);
        await notify.send();
      } else {
        const notify = new Notification("Job", `You are already off duty!`, NotificationTypes.Error);
        await notify.send();
      }
    }
  }
}