import { Server } from "../../../server";
import { getClosestPlayer } from "../../../utils";

import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { NotificationTypes } from "../../../../shared/enums/ui/notifications/types";
import { GrabState } from '../../../../shared/enums/jobs/grabStates';
import { LogTypes } from '../../../enums/logging';
import WebhookMessage from '../../../models/webhook/discord/webhookMessage';
import { EmbedColours } from '../../../../shared/enums/logging/embedColours';
import { Ranks } from '../../../../shared/enums/ranks';
import sharedConfig from '../../../../configs/shared.json';

export class Grabbing {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.tryGrabbing, this.EVENT_tryGrabbing.bind(this));
    onNet(JobEvents.grabPlayer, this.EVENT_grabPlayer.bind(this));
  }

  // Events
  private async EVENT_tryGrabbing(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
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

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Action Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Player Grabbed__",
                    description: `A player has grabbed another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Grabbed**: ${closest.GetName}\n**Grabbed Players Rank**: ${Ranks[closest.Rank]}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else if (grabbeesStates.state.grabState == GrabState.Held) {

                myStates.state.grabState = GrabState.None;
                grabbeesStates.state.grabState = GrabState.None;
                await player.TriggerEvent(JobEvents.stopGrabbing);
                await closest.TriggerEvent(JobEvents.stopGrabbing);

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Action Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Player Released__",
                    description: `A player has stopped grabbing another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Released**: ${closest.GetName}\n**Released Players Rank**: ${Ranks[closest.Rank]}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
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
        await player.Notify("Grabbing", "You aren't spawned in!", NotificationTypes.Error);
      }
    }
  }

  private async EVENT_grabPlayer(grabbeeId: number): Promise<void> {
    const grabbingPlayer = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (grabbingPlayer) {
      if (grabbeeId) {
        // console.log("setting player as grabbed", grabbingPlayer.Handle, grabbeeId);
        const grabbeeStates = Player(grabbeeId);
        grabbeeStates.state.grabState = GrabState.Held;
        emitNet(JobEvents.setGrabbed, grabbeeId, grabbingPlayer.Handle);

        const grabbedPlayer = await this.server.connectedPlayerManager.GetPlayer(grabbeeId.toString());
        if (grabbingPlayer) {
          if (grabbingPlayer.Spawned) {
            await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
              username: "Action Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Player Grabbed__",
                description: `A player has grabbed another player.\n\n**Username**: ${grabbingPlayer.GetName}\n**Rank**: ${Ranks[grabbingPlayer.Rank]}\n**Grabbed**: ${grabbedPlayer.GetName}\n**Grabbed Players Rank**: ${Ranks[grabbedPlayer.Rank]}`,
                footer: {
                  text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  icon_url: sharedConfig.serverLogo
                }
              }]
            }));
          }
        }
      } else {
        console.log("closest ped isn't found!");
      }
    } else {
      console.log("your ped isn't found!");
    }
  }
}
