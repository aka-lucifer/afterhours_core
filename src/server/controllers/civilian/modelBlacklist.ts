import { Server } from "../../server";

import { LogTypes } from '../../enums/logging';

import WebhookMessage from '../../models/webhook/discord/webhookMessage';

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from '../../../shared/enums/ranks';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { EmbedColours } from '../../../shared/enums/logging/embedColours';

import serverConfig from '../../../configs/server.json';
import sharedConfig from '../../../configs/shared.json';

export class ModelBlacklist {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
    
    // Events
    onNet(Events.changedPed, this.EVENT_changedPed.bind(this));
  }

  // Methods
  private async hasPermission(myRank: Ranks, pedRank: number): Promise<boolean> {
    if (myRank >= pedRank) {
      return true;
    }

    return false;
  }

  // Events
  private async EVENT_changedPed(pedHash: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const pedData = serverConfig.peds[pedHash];

        if (pedData !== undefined) {
          const hasPermission = await this.hasPermission(player.Rank, pedData.rank);

          if (!hasPermission) {
            const randomModel = sharedConfig.aop.spawnModels[Math.floor(Math.random() * sharedConfig.aop.spawnModels.length)];
            SetPlayerModel(player.Handle, randomModel);

            await player.Notify("Model", "You aren't the correct rank to use this model!", NotificationTypes.Error, 4000);

            await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
              username: "Ped Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Ped Blacklisted__",
                description: `A player has tried to use a blacklisted ped they don't have access to!\n\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Ped Data**: ${JSON.stringify(pedData, null, 4)}\n`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }
      }
    }
  }
}
