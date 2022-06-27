import { Server } from "../../server";
import { getClosestPlayer } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { GagStates } from "../../../shared/enums/gagStates";

export class Gagging {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
    
    // Events
    onNet(Events.tryGagging, this.EVENT_tryGagging.bind(this));
  }

  // Events
  private async EVENT_tryGagging(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const [closest, dist] = await getClosestPlayer(player);

        if (closest) {
          if (closest.Spawned) {
            if (dist < 3) {
              const closestStates = Player(closest.Handle);
              if (closestStates.state.gagState === GagStates.Free) { // If they haven't been gagged
                closestStates.state.gagState = GagStates.Gagged; // Set them to gagged
                MumbleSetPlayerMuted(parseInt(closest.Handle), true); // Mute the player
                emitNet('pma-voice:playerMuted', closest.Handle); // Mute the player
                await closest.TriggerEvent(Events.gagPlayer, true); // Place the gag inside their mouth
                await player.Notify("Gagging", "You have placed a gag in this players mouth.", NotificationTypes.Info);
              } else {
                closestStates.state.gagState = GagStates.Free; // Set them to free
                MumbleSetPlayerMuted(parseInt(closest.Handle), false); // Unmute them
                emitNet('pma-voice:playerMuted', closest.Handle); // Unmute them
                await closest.TriggerEvent(Events.gagPlayer, false); // Remove the gag from their mouth
                await player.Notify("Gagging", "You have removed the gag from this players mouth.", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Gagging", "Player is too far away!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Gagging", "This player isn't spawned in!", NotificationTypes.Error);
          }
        } else {
          await player.Notify("Gagging", "No one found!", NotificationTypes.Error);
        }
      }
    }
  }
}