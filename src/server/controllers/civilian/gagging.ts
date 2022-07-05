import { Server } from "../../server";
import { getClosestPlayer } from "../../utils";

import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { GagStates } from "../../../shared/enums/gagStates";
import { LogTypes } from '../../enums/logging';
import WebhookMessage from '../../models/webhook/discord/webhookMessage';
import { EmbedColours } from '../../../shared/enums/logging/embedColours';
import { Ranks } from '../../../shared/enums/ranks';
import sharedConfig from '../../../configs/shared.json';

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

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Action Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Player Gagged__",
                    description: `A player has gagged another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Gagged**: ${closest.GetName}\n**Gagged Players Rank**: ${Ranks[closest.Rank]}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                closestStates.state.gagState = GagStates.Free; // Set them to free
                MumbleSetPlayerMuted(parseInt(closest.Handle), false); // Unmute them
                emitNet('pma-voice:playerMuted', closest.Handle); // Unmute them
                await closest.TriggerEvent(Events.gagPlayer, false); // Remove the gag from their mouth
                await player.Notify("Gagging", "You have removed the gag from this players mouth.", NotificationTypes.Error);

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Action Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Player Released__",
                    description: `A player has removed another players gag.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Gagged**: ${closest.GetName}\n**Gagged Players Rank**: ${Ranks[closest.Rank]}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
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
