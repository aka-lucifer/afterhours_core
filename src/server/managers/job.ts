import { Server } from "../server";

import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";
import { JobCallbacks } from "../../shared/enums/events/jobs/jobCallbacks";

// Jobs
import { PoliceJob } from "../controllers/jobs/policeJob";

// Controllers
import { JobBlips } from "../controllers/jobs/features/jobBlips";
import { Events } from "../../shared/enums/events/events";
import { NotificationTypes } from '../../shared/enums/ui/notifications/types';
import { LogTypes } from '../enums/logTypes';
import WebhookMessage from '../models/webhook/discord/webhookMessage';
import { EmbedColours } from '../../shared/enums/logging/embedColours';
import { Ranks } from '../../shared/enums/ranks';
import sharedConfig from '../../configs/shared.json';
import { formatFirstName } from '../../shared/utils';
import { GetTimestamp } from '../utils';
import { Playtime } from '../models/database/playtime';

export class JobManager {
  private server: Server;

  // Jobs
  private policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(server: Server) {
    this.server = server;
    
    // Callbacks
    onNet(JobCallbacks.setDuty, this.CALLBACK_setDuty.bind(this));
    onNet(JobCallbacks.updateCallsign, this.CALLBACK_updateCallsign.bind(this));
  }

  // Methods
  public init(): void {
    // Jobs
    this.policeJob = new PoliceJob(this.server);
    this.policeJob.init();
    
    // Controllers
    this.jobBlips = new JobBlips(this.server);
    this.jobBlips.init();
  }

  // Events

  // Callbacks
  private async CALLBACK_setDuty(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          character.Job.Status = data.state;
          if (data.state) {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} On Duty`);
            await player.Notify("Job", `You've gone on duty`, NotificationTypes.Success);
          } else {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} Off Duty`);
            emitNet(JobEvents.unitOffDuty, -1, player.Handle); // Remove this players on duty blip to all on duty players
            await player.Notify("Job", `You've gone off duty`, NotificationTypes.Error);
          }

          await player.TriggerEvent(JobEvents.deleteJobBlips); // Delete all on duty player blips for you
          await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

          // Resync all players & selected characters to all clients, as your on duty status has changed
          emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.connectedPlayers));

          // Logs your clock in/out time to the discord channel
          const discord = await player.GetIdentifier("discord");
          if (data.state) {
            character.Job.statusTime = await GetTimestamp();

            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Green,
                title: `__Unit On Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked on duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Job**: ${JSON.stringify(character.Job, null, 4)}\n**Timestamp**: ${new Date(character.Job.statusTime).toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            const currTime = new Date();
            const timeCalculated = (currTime.getTime() / 1000) - (new Date(character.Job.statusTime).getTime() / 1000);
            const dutyTime = new Playtime(timeCalculated);

            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Red,
                title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Job**: ${JSON.stringify(character.Job, null, 4)}\n**Time On Duty**: ${await dutyTime.FormatTime()}\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }
      }
    }
  }

  private async CALLBACK_updateCallsign(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          const updatedCallsign = character.updateTypes("callsign", data.callsign);
          await player.TriggerEvent(Events.receiveServerCB, updatedCallsign, data); // Update the UI to close and disable NUI focus

          // log it here
        }
      }
    }
  }
}
