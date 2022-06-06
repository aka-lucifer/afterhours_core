import { Server } from "../../../server";
import { getClosestPlayer } from "../../../utils";

import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { NotificationTypes } from "../../../../shared/enums/ui/notifications/types";
import { GrabState } from '../../../../shared/enums/jobs/grabStates';

export class Grabbing {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.grabPlayer, this.EVENT_grabPlayer.bind(this));

    RegisterCommand("grab", async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);
          if (character.isLeoJob()) { // If your selected character is an LEO
            if (character.Job.Status) { // If your character is on duty
              const [closest, dist] = await getClosestPlayer(player);

              if (closest) {
                if (dist < 3) {
                  const closestCharacter = await this.server.characterManager.Get(closest);
                  if (closestCharacter) {
                    const myStates = Player(player.Handle);
                    const grabbeesStates = Player(closest.Handle);

                    if (grabbeesStates.state.grabState == GrabState.None) {

                      myStates.state.grabState = GrabState.Holding;
                      await player.TriggerEvent(JobEvents.startGrabbing, closest.Handle, player.Handle);
                    } else if (grabbeesStates.state.grabState == GrabState.Held) {

                      myStates.state.grabState = GrabState.None;
                      grabbeesStates.state.grabState = GrabState.None;
                      await player.TriggerEvent(JobEvents.stopGrabbing);
                      await closest.TriggerEvent(JobEvents.stopGrabbing);
                    } else if (grabbeesStates.state.grabState == GrabState.Holding) {
                      await player.Notify("Grabbing", "You can't grab this person, as they're already grabbing someone!", NotificationTypes.Error);
                    }
                  } else {
                    await player.Notify("Grabbing", "This person hasn't selected a character!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Grabbing", "Player is too far away!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Grabbing", "No one found!", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Grabbing", "You aren't on duty!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Grabbing", "You aren't an LEO!", NotificationTypes.Error);
          }
        } else {
          await player.Notify("Grabbing", "You aren't spawned in!", NotificationTypes.Error);
        }
      }
    }, false);
  }

  // Events
  private async EVENT_grabPlayer(grabbeeId: number): Promise<void> {
    const grabbingPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (grabbingPlayer) {
      if (grabbeeId) {
        // console.log("setting player as grabbed", grabbingPlayer.Handle, grabbeeId);
        const grabbeeStates = Player(grabbeeId);
        grabbeeStates.state.grabState = GrabState.Held;
        emitNet(JobEvents.setGrabbed, grabbeeId, grabbingPlayer.Handle);
      } else {
        console.log("closest ped isn't found!");
      }
    } else {
      console.log("your ped isn't found!");
    }
  }
}
