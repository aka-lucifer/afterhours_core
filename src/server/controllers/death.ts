import { Server } from '../server';

import { LogTypes } from "../enums/logging";

import { Command } from '../models/ui/chat/command';
import WebhookMessage from '../models/webhook/discord/webhookMessage';

import { Ranks } from '../../shared/enums/ranks';
import { Events } from '../../shared/enums/events/events';
import { Message } from '../../shared/models/ui/chat/message';
import { SystemTypes } from '../../shared/enums/ui/chat/types';
import { DeathStates } from '../../shared/enums/deathStates';
import { EmbedColours } from '../../shared/enums/logging/embedColours';

import sharedConfig from "../../configs/shared.json";

export class Death {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.playerKilled, this.EVENT_playerDied.bind(this));
    onNet(Events.revivePlayer, this.EVENT_revivePlayer.bind(this));
  }

  // Events
  private async EVENT_playerDied(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        const playerStates = Player(player.Handle);

        if (playerStates.state.deathState === DeathStates.Alive) {
          playerStates.state.deathState = DeathStates.Dead;
          await player.TriggerEvent(Events.playerDead);
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("This player isn't dead!", SystemTypes.Error));
        }
      }
    }
  }

  private async EVENT_revivePlayer(playerId: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        if (player.Rank >= Ranks.Admin) {
          const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);
          if (foundPlayer) {
            if (foundPlayer.Spawned) {
              const playerStates = Player(foundPlayer.Handle);

              if (playerStates.state.deathState == DeathStates.Dead) {
                playerStates.state.deathState = DeathStates.Alive;
                await foundPlayer.TriggerEvent(Events.revive); // Revive player
                
                // Send revived chat messages
                await player.TriggerEvent(Events.sendSystemMessage, new Message(`You have revived ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));
                await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You have been revived by ^3${player.GetName}^0.`, SystemTypes.Admin));

                // Log revive here
                const updatersDiscord = await player.GetIdentifier("discord");
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Player Revived__",
                    description: `A player has been revived.\n\n**Username**: ${foundPlayer.GetName}\n**Rank**: ${Ranks[foundPlayer.Rank]}\n**Revived By**: ${player.GetName}\n**Revivers Rank**: ${Ranks[player.Rank]}\n**Revivers Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("This player isn't dead!", SystemTypes.Error));
              }
            } else {
              await player.TriggerEvent(Events.sendSystemMessage, new Message("This player isn't spawned in!", SystemTypes.Error));
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("No player found with that server ID!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("Access Denied!", SystemTypes.Error));
        }
      }
    }
  }

  // Methods
  private registerCommands(): void {
    new Command("revive", "Revive a player.", [{name: "server_id", help: "The server ID of the player you're reviving."}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);
          if (character) {
            const hasPermission = player.Rank >= Ranks.Admin || character.isLeoJob() && character.Job.status || character.isSAFREMSJob() && character.Job.status;

            if (hasPermission) {
              const reviving = await this.server.connectedPlayerManager.GetPlayer(args[0]);
              if (reviving) {
                if (reviving.Spawned) {
                  const playerStates = Player(reviving.Handle);

                  if (playerStates.state.deathState == DeathStates.Dead) {
                    playerStates.state.deathState = DeathStates.Alive;
                    await reviving.TriggerEvent(Events.revive); // Revive player
                    
                    // Send revived chat messages
                    await player.TriggerEvent(Events.sendSystemMessage, new Message(`You have revived ^3${reviving.GetName}^0.`, SystemTypes.Admin));
                    await reviving.TriggerEvent(Events.sendSystemMessage, new Message(`You have been revived by ^3${player.GetName}^0.`, SystemTypes.Admin));
                  } else {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message("This player isn't dead!", SystemTypes.Error));
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("This player isn't spawned in!", SystemTypes.Error));
                }
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("No player found with that server ID!", SystemTypes.Error));
              }
            } else {
              await player.TriggerEvent(Events.sendSystemMessage, new Message("Access Denied!", SystemTypes.Error));
            }
          }
        }
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();
  }
}
