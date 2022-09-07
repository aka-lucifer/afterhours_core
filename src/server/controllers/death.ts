import { VehicleSeat } from 'fivem-js';

import { Server } from '../server';
import { Error, Inform } from '../utils';

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
  private deadPlayers: Record<string, any> = {};

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.playersDeath, this.EVENT_playersDeath.bind(this));
    onNet(Events.revivePlayer, this.EVENT_revivePlayer.bind(this));
    onNet(Events.syncRevive, this.EVENT_syncRespawn.bind(this));
  }

  // Methods
  public async PlayerDead(handle: string): Promise<boolean> {
    const deathState = Player(handle);
    return deathState.state.deathState === DeathStates.Dead;
  }

  // Events
  private async EVENT_playersDeath(insideVeh: boolean, seat: VehicleSeat): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        const playerStates = Player(player.Handle);

        if (playerStates.state.deathState === DeathStates.Alive) {
          this.deadPlayers[player.Handle] = DeathStates.Dead;
          playerStates.state.deathState = DeathStates.Dead;
          await player.TriggerEvent(Events.playerDead, insideVeh, seat);
        }
      }
    }
  }

  private async EVENT_revivePlayer(netId: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        if (player.Rank >= Ranks.Moderator) {
          const foundPlayer = await this.server.connectedPlayerManager.GetPlayer(netId.toString());
          if (foundPlayer) {
            if (foundPlayer.Spawned) {
              const playerStates = Player(foundPlayer.Handle);

              if (playerStates.state.deathState == DeathStates.Dead) {
                this.deadPlayers[foundPlayer.Handle] = DeathStates.Alive;
                playerStates.state.deathState = DeathStates.Alive;
                await foundPlayer.TriggerEvent(Events.revive); // Revive player
                
                // Send revived chat messages
                if (foundPlayer.Handle !== player.Handle) {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've revived ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));
                  await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You've been revived by ^3${player.GetName}^0.`, SystemTypes.Admin));
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've revived yourself.`, SystemTypes.Admin));
                }

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

  private async EVENT_syncRespawn(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      const playerDead = await this.PlayerDead(player.Handle);
      if (playerDead) {
        const deathState = Player(player.Handle);
        deathState.state.deathState = DeathStates.Alive;
      }
    }
  }

  // Methods
  private registerCommands(): void {
    new Command("revive", "Revive a player.", [{name: "server_id", help: "The server ID of the player you're reviving."}], false, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);
          if (character) {
            const hasPermission = player.Rank >= Ranks.Moderator || character.isLeoJob() && character.Job.status || character.isSAFREMSJob() && character.Job.status;

            if (hasPermission) {
              const reviving = args[0] !== undefined ? await this.server.connectedPlayerManager.GetPlayer(args[0]) : player; // If your entered server ID is null, revive yourself
              if (reviving) {
                if (reviving.Spawned) {
                  const playerStates = Player(reviving.Handle);

                  if (playerStates.state.deathState == DeathStates.Dead) {
                    this.deadPlayers[reviving.Handle] = DeathStates.Alive;
                    playerStates.state.deathState = DeathStates.Alive;
                    await reviving.TriggerEvent(Events.revive); // Revive player

                    // Send revived chat messages
                    if (reviving.Handle !== player.Handle) {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've revived ^3${reviving.GetName}^0.`, SystemTypes.Admin));
                      await reviving.TriggerEvent(Events.sendSystemMessage, new Message(`You've been revived by ^3${player.GetName}^0.`, SystemTypes.Admin));
                    } else {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've revived yourself.`, SystemTypes.Admin));
                    }
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

    RegisterCommand("revive", async(source: number, args: any[]) => {
      if (source === 0) {
        const reviving = await this.server.connectedPlayerManager.GetPlayer(args[0]); // If your entered server ID is null, revive yourself
        if (reviving) {
          if (reviving.Spawned) {
            const playerStates = Player(reviving.Handle);

            if (playerStates.state.deathState == DeathStates.Dead) {
              this.deadPlayers[reviving.Handle] = DeathStates.Alive;
              playerStates.state.deathState = DeathStates.Alive;
              await reviving.TriggerEvent(Events.revive); // Revive player

              // Send revived chat messages
              Inform("Revive Command", `You have revived [${reviving.Handle}] - ${reviving.GetName} | ${reviving.selectedCharacter.firstName} ${reviving.selectedCharacter.lastName}`)
              await reviving.TriggerEvent(Events.sendSystemMessage, new Message(`You have been revived by ^3System^0.`, SystemTypes.Admin));
            } else {
              Error("Revive Command", "This player isn't dead!");
            }
          } else {
            Error("Revive Command", "This player isn't spawned in!");
          }
        } else {
          Error("Revive Command", "No player found with that server ID!");
        }
      }
    }, false);
  }

  public init(): void {
    this.registerCommands();
  }
}
