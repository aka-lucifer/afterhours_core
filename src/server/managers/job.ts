import { Server } from "../server";

import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";
import { JobCallbacks } from "../../shared/enums/events/jobs/jobCallbacks";

// Jobs
import { PoliceJob } from "../controllers/jobs/policeJob";

// Controllers
import { JobBlips } from "../controllers/jobs/features/jobBlips";
import { Events } from "../../shared/enums/events/events";
import { GetHash } from "../utils";

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
    
    // Controllers
    this.jobBlips = new JobBlips(this.server);
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
          } else {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} Off Duty`);
          }
          await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

          // Resync all players & selected characters to all clients, as your on duty status has changed
          emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.connectedPlayers));

          // webhook log and duty timer in some LEO timer
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