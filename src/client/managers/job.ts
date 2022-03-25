import { Capitalize, keyboardInput } from "../utils";
import { Client } from "../client";

import { Notification } from "../models/ui/notification";
import { ServerCallback } from "../models/serverCallback";

import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";
import { JobCallbacks } from "../../shared/enums/events/jobs/jobCallbacks";

// Jobs
import { PoliceJob } from "../controllers/jobs/policeJob";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";

// Controllers
import { JobBlips } from "../controllers/jobs/features/jobBlips";
import { Callbacks } from "../../shared/enums/events/callbacks";

export class JobManager {
  private client: Client;

  // Jobs
  private policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.toggleDuty, this.EVENT_toggleDuty.bind(this));
    onNet(JobEvents.setCallsign, this.EVENT_setCallsign.bind(this));
  }

  // Methods
  public init(): void {
    // Jobs
    this.policeJob = new PoliceJob(this.client);
    this.policeJob.init();

    // Controllers
    this.jobBlips = new JobBlips(this.client);
  }

  // Events
  public async EVENT_toggleDuty(data: Record<string, any>): Promise<void> {
    if (this.client.Character.Job.callsign != "NOT_SET") {
      if (this.client.Character.Job.status != data.state) {

        this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.setDuty, {state: data.state}, async(cbData, passedData) => {
          if (cbData) {
            this.client.Character.Job.status = data.state;
            console.log("Set Duty", Capitalize(this.client.Character.Job.status.toString()));
            
            if (data.state) {
              const notify = new Notification("Job", `You've gone on duty`, NotificationTypes.Success);
              await notify.send();
            } else {
              const notify = new Notification("Job", `You've gone off duty`, NotificationTypes.Success);
              await notify.send();
            }
          }
        }));
      } else {
        if (data.state) {
          const notify = new Notification("Job", `You are already on duty`, NotificationTypes.Error);
          await notify.send();
        } else {
          const notify = new Notification("Job", `You are already off duty`, NotificationTypes.Error);
          await notify.send();
        }
      }
    } else {
      const notify = new Notification("Job", `You have to set your callsign before you go on duty!`, NotificationTypes.Error, 5000);
      await notify.send();
    }
  }

  public async EVENT_setCallsign(): Promise<void> {
    const callsign = await keyboardInput("Callsign", 5);
    if (callsign != null) {
      if (callsign.length > 0) {
        this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.updateCallsign, {callsign: callsign}, async(cbData, passedData) => {
          console.log("result", cbData, passedData);

          if (cbData) {
            this.client.Character.Job.Callsign = callsign; 
            const notify = new Notification("Job", `You've set your callsign to (${callsign})`, NotificationTypes.Success);
            await notify.send();
          } else {
            const notify = new Notification("Job", `There was an error updating your callsign!`, NotificationTypes.Error);
            await notify.send();
          }
        }));
      } else {
        const notify = new Notification("Job", `You haven't entered a callsign!`, NotificationTypes.Error);
        await notify.send();
      }
    } else {
      const notify = new Notification("Job", `You haven't entered a callsign!`, NotificationTypes.Error);
      await notify.send();
    }
  }
}