import { Server } from "../../server";
import { getClosestPlayer } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { KidnapStates } from "../../../shared/enums/kidnapStates";

export class Kidnapping {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
    
    // Events
    onNet(Events.tryKidnapping, this.EVENT_tryKidnapping.bind(this));
  }

  // Events
  private async EVENT_tryKidnapping(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const [closest, dist] = await getClosestPlayer(player);

        if (closest) {
          if (closest.Spawned) {
            if (dist < 3) {
              const closestStates = Player(closest.Handle);
              if (closestStates.state.kidnapState === KidnapStates.Free) { // If they haven't been kidnapped
                closestStates.state.kidnapState = KidnapStates.Kidnapped; // Set them to kidnapped
                await closest.TriggerEvent(Events.kidnapPlayer, true);
                await player.Notify("Kidnapping", "You have placed a bag over this players head.", NotificationTypes.Info);
              } else {
                closestStates.state.kidnapState = KidnapStates.Free; // Set them to free
                await closest.TriggerEvent(Events.kidnapPlayer, false);
                await player.Notify("Kidnapping", "You have removed the bag off this players head.", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Kidnapping", "Player is too far away!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Kidnapping", "This player isn't spawned in!", NotificationTypes.Error);
          }
        } else {
          await player.Notify("Kidnapping", "No one found!", NotificationTypes.Error);
        }
      }
    }
  }
}