import { Server } from '../server';
import { Command } from '../models/ui/chat/command';
import { Ranks } from '../../shared/enums/ranks';
import { Events } from '../../shared/enums/events/events';
import { Message } from '../../shared/models/ui/chat/message';
import { SystemTypes } from '../../shared/enums/ui/chat/types';
import { DeathStates } from '../../shared/enums/deathStates';
import { LXEvents } from '../../shared/enums/events/lxEvents';

export class Death {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.playerKilled, this.EVENT_playerDied.bind(this));
  }

  // Events
  private async EVENT_playerDied(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);

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

  // Methods
  private registerCommands(): void {
    new Command("revive", "Revive a player.", [{name: "server_id", help: "The server ID of the player you're reviving."}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);
          if (character) {
            const hasPermission = player.Rank >= Ranks.Admin || character.isLeoJob() && character.Job.status || character.isSAFREMSJob() && character.Job.status;
            console.log("revive permission", hasPermission);

            if (hasPermission) {
              const reviving = await this.server.connectedPlayerManager.GetPlayer(args[0]);
              if (reviving) {
                if (reviving.Spawned) {
                  const playerStates = Player(reviving.Handle);

                  if (playerStates.state.deathState == DeathStates.Dead) {
                    playerStates.state.deathState = DeathStates.Alive;
                    await reviving.TriggerEvent(Events.revivePlayer);
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
