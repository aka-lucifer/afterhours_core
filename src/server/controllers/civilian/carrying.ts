import { Server } from "../../server";
import { getClosestPlayer } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { CarryStates } from "../../../shared/enums/carryStates"
import { CuffState } from "../../../shared/enums/jobs/cuffStates";
import { LogTypes } from '../../enums/logging';
import WebhookMessage from '../../models/webhook/discord/webhookMessage';
import { EmbedColours } from '../../../shared/enums/logging/embedColours';
import { Ranks } from '../../../shared/enums/ranks';
import sharedConfig from '../../../configs/shared.json';

export class Carrying {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
    
    // Events
    onNet(Events.tryCarrying, this.EVENT_tryCarrying.bind(this));
  }

  // Events
  private async EVENT_tryCarrying(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const [closest, dist] = await getClosestPlayer(player);

        if (closest) {
          if (dist < 3) {
            if (closest.Spawned) {
              const myStates = Player(player.Handle);
              console.log("cuff states ting", myStates.state.cuffState);
              if (myStates.state.cuffState === CuffState.Uncuffed) { // If you aren't handcuffed
                console.log("my carryState", myStates.state.carryState);
                if (myStates.state.carryState === CarryStates.Free || myStates.state.carryState === CarryStates.Carrying) { // If you aren't carrying anyone or being carried
                  const closestStates = Player(closest.Handle);
                  console.log("closest carryState", closestStates.state.carryState);
                  if (closestStates.state.carryState === CarryStates.Free) { // If they aren't being carried
                    console.log("start carrying", player.Handle, closest.Handle);
                    myStates.state.carryState = CarryStates.Carrying; // Set you to carrying
                    closestStates.state.carryState = CarryStates.Carried; // Set them to carried
                    await closest.TriggerEvent(Events.carryPlayer, player.Handle);
                    await player.TriggerEvent(Events.startCarrying);

                    await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                      username: "Action Logs", embeds: [{
                        color: EmbedColours.Green,
                        title: "__Player Carried__",
                        description: `A player has started carrying a player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Carried**: ${closest.GetName}\n**Carried Players Rank**: ${Ranks[closest.Rank]}`,
                        footer: {
                          text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                          icon_url: sharedConfig.serverLogo
                        }
                      }]
                    }));
                  } else {
                    console.log("stop carrying", player.Handle, closest.Handle);
                    myStates.state.carryState = CarryStates.Free; // Set you to free
                    closestStates.state.carryState = CarryStates.Free; // Set them to free
                    await closest.TriggerEvent(Events.stopCarrying);
                    await player.TriggerEvent(Events.stopCarrying);

                    await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                      username: "Action Logs", embeds: [{
                        color: EmbedColours.Red,
                        title: "__Player Carried__",
                        description: `A player has been dropped a player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Dropped**: ${closest.GetName}\n**Dropped Players Rank**: ${Ranks[closest.Rank]}`,
                        footer: {
                          text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                          icon_url: sharedConfig.serverLogo
                        }
                      }]
                    }));
                  }
                } else {
                  await player.Notify("Carrying", "You can't carry someone, whilst you're being carried!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Carrying", "You can't carry someone, whilst you're handcuffed!", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Carrying", "This player isn't spawned in!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Carrying", "No one found!", NotificationTypes.Error);
          }
        } else {
          await player.Notify("Carrying", "No one found!", NotificationTypes.Error);
        }
      }
    }
  }
}
