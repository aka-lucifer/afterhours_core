import { Server } from "../server";

import { JobEvents } from "../../shared/enums/events/jobEvents";

// Jobs
import { PoliceJob } from "../controllers/jobs/policeJob";

// Controllers
import { JobBlips } from "../controllers/jobs/features/jobBlips";

export class JobManager {
  private server: Server;

  // Jobs
  private policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.setDuty, this.EVENT_setDuty.bind(this));
  }

  // Methods
  public init(): void {
    // Jobs
    this.policeJob = new PoliceJob(this.server);
    
    // Controllers
    this.jobBlips = new JobBlips(this.server);
  }

  // Events
  public async EVENT_setDuty(state: boolean): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          character.Job.Status = state;
          if (state) {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} On Duty`);
          } else {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} Off Duty`);
          }
        }
      }
    }
  }
}