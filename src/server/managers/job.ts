import { Server } from "../server";

import { JobEvents } from "../../shared/enums/events/jobEvents";

export class JobManager {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.setDuty, this.EVENT_setDuty.bind(this));
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