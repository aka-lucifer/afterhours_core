import {Server} from '../../../server';
import {getClosestPlayer, Inform, Log} from '../../../utils';

import WebhookMessage from '../../../models/webhook/discord/webhookMessage';

import {LogTypes} from '../../../enums/logging';

import {JobEvents} from '../../../../shared/enums/events/jobs/jobEvents';
import {CuffState} from '../../../../shared/enums/jobs/cuffStates';
import {NotificationTypes} from '../../../../shared/enums/ui/notifications/types';
import {Message} from '../../../../shared/models/ui/chat/message';
import {SystemTypes} from '../../../../shared/enums/ui/chat/types';
import {formatFirstName} from '../../../../shared/utils';
import {Events} from '../../../../shared/enums/events/events';
import {Jobs} from '../../../../shared/enums/jobs/jobs';
import {EmbedColours} from '../../../../shared/enums/logging/embedColours';
import {Ranks} from '../../../../shared/enums/ranks';
import {Callbacks} from "../../../../shared/enums/events/callbacks";

import sharedConfig from '../../../../configs/shared.json';

export class Cuffing {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.cuffPlayer, this.EVENT_cuffPlayer.bind(this))
    onNet(JobEvents.uncuffPlayer, this.EVENT_uncuffPlayer.bind(this));
  }

  // Events
  private async EVENT_cuffPlayer(): Promise<void> {
    let player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        let character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
            if (character.Job.Status) { // If your character is on duty
              let [perpsPlayer, dist] = await getClosestPlayer(player);

              if (perpsPlayer) {
                if (dist < 3) {
                  const closestCharacter = await this.server.characterManager.Get(perpsPlayer);
                  if (closestCharacter) {
                    let perpStates = Player(perpsPlayer.Handle);
                    if (perpStates.state.cuffState == CuffState.Uncuffed) {
                      console.log("cuff him!");

                      await player.TriggerEvent(JobEvents.startCuffing);
                      this.server.cbManager.TriggerClientCallback(Callbacks.getCuffed, async (cuffedPlayer: boolean, clientHandle: number, triggeredBy: number) => {
                        player = await this.server.connectedPlayerManager.GetPlayer(triggeredBy.toString());
                        character = await this.server.characterManager.Get(player);

                        perpsPlayer = await this.server.connectedPlayerManager.GetPlayer(clientHandle.toString());
                        dist = -1;

                        if (cuffedPlayer) {
                          const perpsCharacter = await this.server.characterManager.Get(perpsPlayer);
                          perpStates = Player(perpsPlayer.Handle);
                          perpStates.state.set("cuffState", CuffState.Cuffed, true); // Set their state bag to cuffed

                          // Send /me message below
                          const svPlayers = this.server.connectedPlayerManager.GetPlayers;

                          for (let i = 0; i < svPlayers.length; i++) {
                            const otherPlayer = svPlayers[i];
                            const dist = player.Position.distance(otherPlayer.Position);

                            Log("Proximity Message", `My Position: ${JSON.stringify(player.Position)} | Other Position: ${JSON.stringify(otherPlayer.Position)} | Dist: ${dist}`);

                            if (dist <= 60.0) {
                              Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${character.Owner.GetName})`);
                              if (character.isLeoJob()) {
                                await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`handcuffs ${perpsCharacter.Name}`, SystemTypes.Me), `[${character.Job.Callsign}] | ${formatFirstName(character.firstName)}. ${character.lastName}`);
                              } else if (character.Job.name === Jobs.Community) {
                                await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`handcuffs ${perpsCharacter.Name}`, SystemTypes.Me), `${formatFirstName(character.firstName)}. ${character.lastName}`);
                              }
                            }
                          }

                          await perpsPlayer.Notify("Cuffing", "You've been placed in handcuffs.", NotificationTypes.Info);

                          // Display 3D /me above your head
                          await this.server.characterManager.meDrawing(parseInt(player.Handle), `handcuffs ${perpsCharacter.Name}`);

                          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                            username: "Action Logs", embeds: [{
                              color: EmbedColours.Green,
                              title: "__Player Cuffed__",
                              description: `A player has cuffed another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Cuffed**: ${perpsPlayer.GetName}\n**Cuffed Players Rank**: ${Ranks[perpsPlayer.Rank]}`,
                              footer: {
                                text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                                icon_url: sharedConfig.serverLogo
                              }
                            }]
                          }));
                        }
                      }, {arresting: player.Handle}, parseInt(perpsPlayer.Handle), parseInt(player.Handle));
                    } else if (perpStates.state.cuffState == CuffState.Shackled) {
                      await player.Notify("Cuffing", "This person can't be cuffed, as they're already shackled!", NotificationTypes.Error);
                    } else {
                      await player.Notify("Cuffing", "This person is already cuffed!", NotificationTypes.Error);
                    }
                  } else {
                    await player.Notify("Cuffing", "This person hasn't selected a character!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Cuffing", "Player is too far away!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Cuffing", "No one found!", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Cuffing", "You aren't on duty!", NotificationTypes.Error);
            }
          }
        }
      }
    }
  }

  private async EVENT_uncuffPlayer(): Promise<void> {
    let player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      if (player.Spawned) {
        let character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
            if (character.Job.Status) { // If your character is on duty
              let [perpsPlayer, dist] = await getClosestPlayer(player);

              if (perpsPlayer) {
                if (dist < 3) {
                  const closestCharacter = await this.server.characterManager.Get(perpsPlayer);
                  if (closestCharacter) {
                    let perpStates = Player(perpsPlayer.Handle);
                    if (perpStates.state.cuffState == CuffState.Cuffed || perpStates.state.cuffState == CuffState.Shackled) {
                      await perpsPlayer.TriggerEvent(JobEvents.setGrabbed, player.Handle); // Attach them to us

                      this.server.cbManager.TriggerClientCallback(Callbacks.startUncuffing, async (uncuffedPlayer: boolean, clientHandle: number, triggeredBy: number) => {
                        player = await this.server.connectedPlayerManager.GetPlayer(clientHandle.toString());
                        character = await this.server.characterManager.Get(player);

                        perpsPlayer = await this.server.connectedPlayerManager.GetPlayer(triggeredBy.toString());
                        dist = -1;

                        if (uncuffedPlayer) {
                          perpStates = Player(perpsPlayer.Handle);

                          await perpsPlayer.TriggerEvent(JobEvents.stopGrabbing); // Detach them
                          await perpsPlayer.TriggerEvent(JobEvents.setUncuffed); // Uncuff them
                          perpStates.state.cuffState = CuffState.Uncuffed; // Set them to uncuffed

                          await perpsPlayer.Notify("Cuffing", "You've been uncuffed", NotificationTypes.Info);

                          const svPlayers = this.server.connectedPlayerManager.GetPlayers;

                          for (let i = 0; i < svPlayers.length; i++) {
                            const otherPlayer = svPlayers[i];
                            const dist = player.Position.distance(otherPlayer.Position);

                            Log("Proximity Message", `My Position: ${JSON.stringify(player.Position)} | Other Position: ${JSON.stringify(otherPlayer.Position)} | Dist: ${dist}`);

                            if (dist <= 60.0) {
                              Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${character.Owner.GetName})`);

                              if (character.isLeoJob()) {
                                await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`uncuffs ${closestCharacter.Name}`, SystemTypes.Me), `[${character.Job.Callsign}] | ${formatFirstName(character.firstName)}. ${character.lastName}`);
                              } else if (character.Job.name === Jobs.Community) {
                                await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`uncuffs ${closestCharacter.Name}`, SystemTypes.Me), `${formatFirstName(character.firstName)}. ${character.lastName}`);
                              }
                            }
                          }

                          // Display 3D /me above your head
                          await this.server.characterManager.meDrawing(parseInt(player.Handle), `Uncuffs ${closestCharacter.Name}`);

                          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                            username: "Action Logs", embeds: [{
                              color: EmbedColours.Red,
                              title: "__Player Uncuffed__",
                              description: `A player has uncuffed another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Uncuffed**: ${perpsPlayer.GetName}\n**Uncuffed Players Rank**: ${Ranks[perpsPlayer.Rank]}`,
                              footer: {
                                text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                                icon_url: sharedConfig.serverLogo
                              }
                            }]
                          }));
                        }
                      }, {}, parseInt(player.Handle), parseInt(perpsPlayer.Handle));
                    } else {
                      await player.Notify("Cuffing", "This person isn't cuffed!", NotificationTypes.Error);
                    }
                  } else {
                    await player.Notify("Cuffing", "This person hasn't selected a character!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Cuffing", "Player is too far away!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Cuffing", "No one found!", NotificationTypes.Error);
              }
            } else {
              await player.Notify("Cuffing", "You aren't on duty!", NotificationTypes.Error);
            }
          }
        }
      }
    }
  }
}
