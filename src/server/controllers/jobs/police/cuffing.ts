import { Server } from "../../../server";
import { getClosestPlayer } from "../../../utils";

import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { CuffState } from "../../../../shared/enums/jobs/cuffStates";
import { Vector3 } from "fivem-js";
import { NotificationTypes } from "../../../../shared/enums/ui/notifications/types";

export class Cuffing {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.doPerpBackAnim, this.EVENT_doPerpBackAnim.bind(this));
    onNet(JobEvents.doPerpFrontAnim, this.EVENT_doPerpFrontAnim.bind(this));
    onNet(JobEvents.setFinished, this.EVENT_setFinished.bind(this));

    RegisterCommand("cuff", async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (player) {
        if (player.Spawned) {
          const [closest, dist] = await getClosestPlayer(player);
          console.log("closest player", closest, dist)
          if (dist < 3) {
            const perpStates = Player(closest.Handle);
            if (perpStates.state.cuffState == CuffState.Uncuffed) {
              await player.TriggerEvent(JobEvents.cuffPlayer, closest.Handle);
            } else if (perpStates.state.cuffState == CuffState.Shackled) {
              await player.Notify("Cuffing", "This person can't be cuffed, as they're already shackled!", NotificationTypes.Error);
            } else {
              await player.Notify("Cuffing", "This person is already cuffed!", NotificationTypes.Error);
            }
          }
        }
      }
    }, false);
  }

  // Events
  private async EVENT_doPerpBackAnim(netToArrest: number, perpPos: Vector3, perpRot: Vector3): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob()) { // If your selected character is an LEO
          // if (character.Job.Status) { // If your character is on duty
            console.log("do perp back anim!");
            const perpStates = Player(netToArrest);
            perpStates.state.cuffState = CuffState.BeingCuffed;
            emitNet(JobEvents.playPerpBackAnim, netToArrest, perpPos, perpRot);
          // }
        }
      }
    }
  }
  
  private async EVENT_doPerpFrontAnim(netToArrest: number, perpPos: Vector3, perpRot: Vector3): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob()) { // If your selected character is an LEO
          // if (character.Job.Status) { // If your character is on duty
            console.log("do perp front anim!");
            const perpStates = Player(netToArrest);
            perpStates.state.cuffState = CuffState.BeingCuffed;
            emitNet(JobEvents.playPerpFrontAnim, netToArrest, perpPos, perpRot);
          // }
        }
      }
    }
  }
  
  private async EVENT_setFinished(netToArrest: string): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob()) { // If your selected character is an LEO
          // if (character.Job.Status) { // If your character is on duty
            const perpStates = Player(netToArrest);
            perpStates.state.set("cuffState", CuffState.Cuffed, true); // Set their state bag to cuffed
            emitNet(JobEvents.setCuffed, netToArrest); // Start their cuff event (attach handcuff prop, disable controls, start tick)
          // }
        }
      }
    }
  }
}