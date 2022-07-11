import { Server } from '../../server';


import { formatSplitCapitalString, splitCapitalsString } from '../../../shared/utils';

import { Callbacks } from '../../../shared/enums/events/callbacks';
import { Events } from '../../../shared/enums/events/events';
import { Ranks } from '../../../shared/enums/ranks';

interface scoreboardPlayer {
  id: string,
  name: string,
  rank: string,
  ping: number
}

export class Scoreboard {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.getScoreboardData, this.CALLBACK_getScoreboardData.bind(this));
  }

  // Callbacks
  private async CALLBACK_getScoreboardData(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;
        const players: scoreboardPlayer[] = [];

        for (let a = 0; a < svPlayers.length; a++) {
          const rankLabelSplit = splitCapitalsString(Ranks[svPlayers[a].Rank]);
          const rankLabel = formatSplitCapitalString(rankLabelSplit);

          players.push({
            id: svPlayers[a].Handle,
            name: svPlayers[a].GetName,
            rank: rankLabel,
            ping: svPlayers[a].RefreshPing()
          })
        }

        await player.TriggerEvent(Events.receiveServerCB, {
          maxPlayers: this.server.GetMaxPlayers,
          recievedPlayers: players
        }, data);
      }
    }
  }
}
