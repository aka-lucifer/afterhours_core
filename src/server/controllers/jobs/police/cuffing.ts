import { Vector3 } from 'fivem-js';

import { Server } from '../../../server';
import { Delay, getClosestPlayer, Inform, Log } from '../../../utils';

import { JobEvents } from '../../../../shared/enums/events/jobs/jobEvents';
import { CuffState } from '../../../../shared/enums/jobs/cuffStates';
import { NotificationTypes } from '../../../../shared/enums/ui/notifications/types';
import { Message } from '../../../../shared/models/ui/chat/message';
import { SystemTypes } from '../../../../shared/enums/ui/chat/types';
import { formatFirstName } from '../../../../shared/utils';
import { Events } from '../../../../shared/enums/events/events';
import { Jobs } from '../../../../shared/enums/jobs/jobs';

export class Cuffing {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.cuffPlayer, this.EVENT_cuffPlayer.bind(this))
    onNet(JobEvents.uncuffPlayer, this.EVENT_uncuffPlayer.bind(this));
    onNet(JobEvents.doPerpBackAnim, this.EVENT_doPerpBackAnim.bind(this));
    onNet(JobEvents.doPerpFrontAnim, this.EVENT_doPerpFrontAnim.bind(this));
    onNet(JobEvents.setFinished, this.EVENT_setFinished.bind(this));
  }

  // Events
  private async EVENT_cuffPlayer(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);

    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
          if (character.Job.Status) { // If your character is on duty
            const [closest, dist] = await getClosestPlayer(player);

            if (closest) {
              if (dist < 3) {
                const closestCharacter = await this.server.characterManager.Get(closest);
                if (closestCharacter) {
                  const perpStates = Player(closest.Handle);
                  if (perpStates.state.cuffState == CuffState.Uncuffed) {
                    console.log("cuff him!");
                    await player.TriggerEvent(JobEvents.startCuffing, closest.Handle);
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

  private async EVENT_uncuffPlayer(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);

    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
          if (character.Job.Status) { // If your character is on duty
            const [closest, dist] = await getClosestPlayer(player);

            if (closest) {
              if (dist < 3) {
                const closestCharacter = await this.server.characterManager.Get(closest);
                if (closestCharacter) {
                  const perpStates = Player(closest.Handle);
                  if (perpStates.state.cuffState == CuffState.Cuffed || perpStates.state.cuffState == CuffState.Shackled) {
                    await closest.TriggerEvent(JobEvents.setGrabbed, player.Handle); // Attach them to us

                    // Display progress UI for 2 seconds.
                    await player.TriggerEvent(JobEvents.startUncuffing);
                    await Delay(2000); // Wait 2 seconds

                    await closest.TriggerEvent(JobEvents.stopGrabbing); // Detach them
                    await closest.TriggerEvent(JobEvents.setUncuffed); // Uncuff them
                    perpStates.state.cuffState = CuffState.Uncuffed; // Set them to uncuffed

                    await closest.Notify("Cuffing", "You've been uncuffed", NotificationTypes.Success);

                    // Send /me message below
                    const svPlayers = this.server.connectedPlayerManager.GetPlayers;

                    for (let i = 0; i < svPlayers.length; i++) {
                      const otherPlayer = svPlayers[i];
                      const dist = player.Position.distance(otherPlayer.Position);

                      Log("Proximity Message", `My Position: ${JSON.stringify(player.Position)} | Other Position: ${JSON.stringify(otherPlayer.Position)} | Dist: ${dist}`);

                      if (dist <= 60.0) {
                        Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${character.Owner.GetName})`);
                        await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`uncuffs ${closestCharacter.Name}`, SystemTypes.Me), `[${character.Job.Callsign}] | ${formatFirstName(character.firstName)}. ${character.lastName}`);
                      }
                    }

                    // Display 3D /me above your head
                    await this.server.characterManager.meDrawing(parseInt(player.Handle), `Uncuffs ${closestCharacter.Name}`);
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

  private async EVENT_doPerpBackAnim(netToArrest: number, perpPos: Vector3, perpRot: Vector3): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
          if (character.Job.Status) { // If your character is on duty
            // console.log("do perp back anim!");
            const perpStates = Player(netToArrest);
            perpStates.state.cuffState = CuffState.BeingCuffed;
            emitNet(JobEvents.playPerpBackAnim, netToArrest, perpPos, perpRot);
          } else {
            await player.Notify("Cuffing", "You aren't on duty!", NotificationTypes.Error);
          }
        }
      }
    }
  }
  
  private async EVENT_doPerpFrontAnim(netToArrest: number, perpPos: Vector3, perpRot: Vector3): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
          if (character.Job.Status) { // If your character is on duty
            // console.log("do perp front anim!");
            const perpStates = Player(netToArrest);
            perpStates.state.cuffState = CuffState.BeingCuffed;
            emitNet(JobEvents.playPerpFrontAnim, netToArrest, perpPos, perpRot);
          } else {
            await player.Notify("Cuffing", "You aren't on duty!", NotificationTypes.Error);
          }
        }
      }
    }
  }
  
  private async EVENT_setFinished(netToArrest: string): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) { // If you have spawned in as a character
        const character = await this.server.characterManager.Get(player);
        if (character.isLeoJob() || character.Job.name === Jobs.Community) { // If your selected character is an LEO
          if (character.Job.Status) { // If your character is on duty
            const perpsPlayer = await this.server.connectedPlayerManager.GetPlayer(netToArrest);
            if (perpsPlayer) {
              if (perpsPlayer.Spawned) {
                const perpsCharacter = await this.server.characterManager.Get(perpsPlayer);
                const perpStates = Player(netToArrest);
                perpStates.state.set("cuffState", CuffState.Cuffed, true); // Set their state bag to cuffed
                emitNet(JobEvents.setCuffed, netToArrest); // Start their cuff event (attach handcuff prop, disable controls, start tick)

                // Send /me message below
                const svPlayers = this.server.connectedPlayerManager.GetPlayers;

                for (let i = 0; i < svPlayers.length; i++) {
                  const otherPlayer = svPlayers[i];
                  const dist = player.Position.distance(otherPlayer.Position);

                  Log("Proximity Message", `My Position: ${JSON.stringify(player.Position)} | Other Position: ${JSON.stringify(otherPlayer.Position)} | Dist: ${dist}`);

                  if (dist <= 60.0) {
                    Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${character.Owner.GetName})`);
                    await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`handcuffs ${perpsCharacter.Name}`, SystemTypes.Me), `[${character.Job.Callsign}] | ${formatFirstName(character.firstName)}. ${character.lastName}`);
                  }
                }

                // Display 3D /me above your head
                await this.server.characterManager.meDrawing(parseInt(player.Handle), `handcuffs ${perpsCharacter.Name}`);
              }
            }
          } else {
            await player.Notify("Cuffing", "You aren't on duty!", NotificationTypes.Error);
          }
        }
      }
    }
  }
}
