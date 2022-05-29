import { Capitalize, keyboardInput } from '../utils';
import { Client } from '../client';

import { Notification } from '../models/ui/notification';
import { ServerCallback } from '../models/serverCallback';

import { JobEvents } from '../../shared/enums/events/jobs/jobEvents';
import { JobCallbacks } from '../../shared/enums/events/jobs/jobCallbacks';

// Jobs
import { PoliceJob } from '../controllers/jobs/policeJob';
import { NotificationTypes } from '../../shared/enums/ui/notifications/types';

// Controllers
import { JobBlips } from '../controllers/jobs/features/jobBlips';
import { Weapons } from '../../shared/enums/weapons';
import { AmmoType, Game } from 'fivem-js';

export class JobManager {
  private client: Client;

  // Jobs
  public policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.toggleDuty, this.EVENT_toggleDuty.bind(this));
    onNet(JobEvents.setCallsign, this.EVENT_setCallsign.bind(this));
    onNet(JobEvents.dutyStateChange, this.EVENT_dutyStateChange.bind(this));
  }

  // Methods
  public async init(): Promise<void> {
    // Jobs
    this.policeJob = new PoliceJob(this.client);
    await this.policeJob.init();

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
            this.client.staffManager.staffMenu.Duty = data.state;
            console.log("Set Duty", Capitalize(this.client.Character.Job.status.toString()));
            
            if (data.state) {
              if (this.client.Character.isLeoJob()) {
                const myPed = Game.PlayerPed;

                // global.exports["pma-voice"].setVoiceProperty("radioEnabled", true);
                // global.exports["pma-voice"].setRadioChannel(1, "[State Trooper] - RTO");

                // // Apply Weapons & Armour
                // if (!HasPedGotWeapon(myPed.Handle, Weapons.AR15, false)) {
                //   const [_1, arAmmo] = GetMaxAmmoByType(myPed.Handle, AmmoType.AssaultRifle);
                //   myPed.giveWeapon(Weapons.AR15, arAmmo, false, false);
                // }

                // if (!HasPedGotWeapon(myPed.Handle, Weapons.BerettaM9, false)) {
                //   const [_2, pistolAmmo] = GetMaxAmmoByType(myPed.Handle, AmmoType.Pistol);
                //   myPed.giveWeapon(Weapons.BerettaM9, pistolAmmo, false, false);
                // }

                // if (!HasPedGotWeapon(myPed.Handle, Weapons.Nightstick, false)) {
                //   myPed.giveWeapon(Weapons.Nightstick, 0, false, false);
                // }

                // SetPedArmour(myPed.Handle, 100);
              }
            } else {
              if (this.client.Character.isLeoJob()) {
                const myPed = Game.PlayerPed;

                // global.exports["pma-voice"].setVoiceProperty("radioEnabled", false);
                // global.exports["pma-voice"].setRadioChannel(0);

                // if (HasPedGotWeapon(myPed.Handle, Weapons.AR15, false)) {
                //   myPed.removeWeapon(Weapons.AR15);
                // }

                // if (HasPedGotWeapon(myPed.Handle, Weapons.BerettaM9, false)) {
                //   myPed.removeWeapon(Weapons.BerettaM9);
                // }

                // if (HasPedGotWeapon(myPed.Handle, Weapons.Nightstick, false)) {
                //   myPed.removeWeapon(Weapons.Nightstick);
                // }

                // if (GetPedArmour(myPed.Handle) > 0) {
                //   SetPedArmour(myPed.Handle, 100);
                // }
              }
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

  private EVENT_dutyStateChange(newState: boolean): void {
    console.log("set duty", newState);
    this.policeJob.commandMenu.toggleBlips(newState);
    this.policeJob.garages.toggleBlips(newState);

    if (newState) { // If on duty
      this.policeJob.registerInteractions();
      this.policeJob.commandMenu.start();
      this.policeJob.garages.start();
    } else { // If off duty
      this.policeJob.deleteInteractions();
      this.policeJob.commandMenu.stop();
      this.policeJob.garages.stop();
    }
  }
}
