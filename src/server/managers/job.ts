import { Server } from '../server';
import { GetTimestamp } from '../utils';

import * as Database from './database/database';

import { LogTypes } from '../enums/logging';

import { Player } from '../models/database/player';
import { Job } from '../models/jobs/job';
import WebhookMessage from '../models/webhook/discord/webhookMessage';
import { Playtime } from '../models/database/playtime';

// Controllers
import { JobBlips } from '../controllers/jobs/features/jobBlips';
import { PoliceJob } from '../controllers/jobs/policeJob';

import { JobEvents } from '../../shared/enums/events/jobs/jobEvents';
import { JobCallbacks } from '../../shared/enums/events/jobs/jobCallbacks';
import { Events } from '../../shared/enums/events/events';
import { NotificationTypes } from '../../shared/enums/ui/notifications/types';
import { EmbedColours } from '../../shared/enums/logging/embedColours';
import { formatFirstName, getRankFromValue } from '../../shared/utils';
import { CountyRanks, PoliceRanks, StateRanks } from '../../shared/enums/jobs/ranks';
import { JobLabels, Jobs } from '../../shared/enums/jobs/jobs';

import sharedConfig from '../../configs/shared.json';
import { Command } from '../models/ui/chat/command';
import { Ranks } from '../../shared/enums/ranks';

interface Unit {
  id: number;
  playerId: number;
  firstName: string;
  lastName: string;
  callsign: string;
  rank: string;
}

export class JobManager {
  private server: Server;

  // Jobs
  public policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(server: Server) {
    this.server = server;
    
    // Callbacks
    onNet(JobCallbacks.setDuty, this.CALLBACK_setDuty.bind(this));
    onNet(JobCallbacks.updateCallsign, this.CALLBACK_updateCallsign.bind(this));
    onNet(JobCallbacks.getUnits, this.CALLBACK_getUnits.bind(this));
    onNet(JobCallbacks.fireUnit, this.CALLBACK_fireUnit.bind(this));
    onNet(JobCallbacks.promoteUnit, this.CALLBACK_promoteUnit.bind(this));
    onNet(JobCallbacks.recruitPlayer, this.CALLBACK_recruitPlayer.bind(this));
  }

  // Methods
  private registerCommands(): void {
    new Command("community", "Become a community officer", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);
          if (character) {
            const updatedJob = await character.updateJob(Jobs.Community, JobLabels.Community, -1, false, character.Job.Callsign, character.Job.Status);
            if (updatedJob) {
              player.selectedCharacter = { // Update selected character to have new job
                id: character.Id,
                firstName: character.firstName,
                lastName: character.lastName,
                nationality: character.nationality,
                backstory: character.backstory,
                dob: character.DOB,
                age: character.Age,
                isFemale: character.Female,
                phone: character.Phone,
                job: character.Job,
                metadata: character.Metadata,
                createdAt: character.CreatedAt,
                lastUpdated: character.LastEdited,
              };

              // Empty owned characters table
              player.characters = [];

              // Sync all players & selected characters to all clients
              emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

              // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
              await this.server.commandManager.deleteChatSuggestions(player);
              this.server.commandManager.createChatSuggestions(player);
              await player.TriggerEvent(Events.updateSuggestions);

              await player.TriggerEvent(Events.updateCharacter, Object.assign({}, character)); // Update our character on our client (char info, job, etc)
              await player.Notify("Jobs", `You've became a ${JobLabels.Community}.`, NotificationTypes.Info);

              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Player Job Updated__",
                  description: `A player has become a ${JobLabels.Community}.\n\n**Username**: ${player.GetName}\n**Character Name**: ${character.Name}\n**New Job**: ${JSON.stringify(character.Job, null, 4)}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));
            }
          }
        }
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();

    // Jobs
    this.policeJob = new PoliceJob(this.server);
    this.policeJob.init();
    
    // Controllers
    this.jobBlips = new JobBlips(this.server);
    this.jobBlips.init();
  }

  // Callbacks
  private async CALLBACK_setDuty(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          character.Job.Status = data.state;

          if (data.state) {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} On Duty`);
            await player.Notify("Job", `You've gone on duty`, NotificationTypes.Success);

            if (character.isLeoJob()) this.server.priority.Add(player); // Insert you into the active units
          } else {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} Off Duty`);
            emitNet(JobEvents.deleteOffDutyUnit, -1, player.Handle); // Remove this players on duty blip to all on duty players

            await player.TriggerEvent(JobEvents.deleteJobBlips); // Delete all on duty player blips for you as you have gone off duty
            await player.Notify("Job", `You've gone off duty`, NotificationTypes.Error);

            if (character.isLeoJob()) {
              if (await this.server.priority.Exists(player)) { // If you're already inside the units array
                await this.server.priority.Remove(player); // Remove your entry from the active units array
              }
            }
          }

          await player.TriggerEvent(JobEvents.dutyStateChange, data.state); // Handles toggling job on/off duty controllers & helpers
          await player.TriggerEvent(Events.receiveServerCB, true, data); // Return that they are on duty

          // Resync all players & selected characters to all clients, as your on duty status has changed
          emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.connectedPlayers));

          if (character.isLeoJob()) {
            // Logs your clock in/out time to the discord channel
            const discord = await player.GetIdentifier("discord");
            if (data.state) {
              character.Job.statusTime = await GetTimestamp();

              await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
                username: "Timesheet Logging", embeds: [{
                  color: EmbedColours.Green,
                  title: `__Unit On Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                  description: `A player has clocked on duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Timestamp**: ${new Date(character.Job.statusTime).toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));
            } else {
              const currTime = new Date();
              const timeCalculated = (currTime.getTime() / 1000) - (new Date(character.Job.statusTime).getTime() / 1000);
              if (timeCalculated > 0) {
                const dutyTime = new Playtime(timeCalculated);
                const dutyTotalTime = await dutyTime.FormatTime();

                await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
                  username: "Timesheet Logging", embeds: [{
                    color: EmbedColours.Red,
                    title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                    description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Time On Duty**: ${dutyTotalTime}\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
                  username: "Timesheet Logging", embeds: [{
                    color: EmbedColours.Red,
                    title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                    description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Time On Duty**: Less than zero sort this shit bby!\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }
            }
          }
        }
      }
    }
  }

  private async CALLBACK_updateCallsign(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob() || character.isSAFREMSJob() || character.Job.name == "cofficer") {
            const oldCallsign = character.Job.Callsign;
            const updatedCallsign = await character.updateTypes("callsign", data.callsign);
            await player.TriggerEvent(Events.receiveServerCB, updatedCallsign, data); // Update the callsign in the DB and return it back to the client

            const discord = await player.GetIdentifier("discord");
            await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
              username: "Callsign Logging", embeds: [{
                color: EmbedColours.Green,
                title: `__Unit Changed Callsign | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has changed their callsign.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Old Callsign**: ${oldCallsign}\n**New Callsign**: ${data.callsign}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }
      }
    }
  }

  private async CALLBACK_getUnits(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob()) {
            if (character.Job.Boss) {
              const units: Unit[] = [];
              const results = await Database.SendQuery("SELECT * FROM `player_characters`", {});

              if (results.data.length > 0) {
                for (let i = 0; i < results.data.length; i++) {
                  // if (results.data[i].player_id !== player.Id) { // If not one of your characters
                    const jobData = JSON.parse(results.data[i].job);
                    const job = new Job(jobData.name, jobData.label, jobData.rank, jobData.isBoss, jobData.callsign, jobData.status);

                    if (job.name == data.type) {
                      if (job.rank < character.Job.rank) { // If the characters job rank is less than yours
                        units.push({
                          id: results.data[i].id,
                          playerId: results.data[i].player_id,
                          firstName: formatFirstName(results.data[i].first_name),
                          lastName: results.data[i].last_name,
                          callsign: job.callsign,
                          rank: await getRankFromValue(job.rank, job.name)
                        });
                      }
                    }
                  // }
                }
              }

              await player.TriggerEvent(Events.receiveServerCB, units, data); // Send back all of the passed depts units
            }
          }
        }
      }
    }
  }

  private async CALLBACK_fireUnit(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob()) {
            if (character.Job.Boss) {
              const tempPlayer = await this.server.playerManager.getPlayerFromId(data.unitsPlayerId);
              if (tempPlayer) {
                if (player.Rank < Ranks.Management && tempPlayer.Rank >= Ranks.SeniorAdmin) {
                  await player.Notify("Command Menu", "You can't fire a Senior Admin or above!", NotificationTypes.Error);
                  return;
                }
              }

              const newJob = new Job("civilian", "Civilian");
              const updatedJob = await Database.SendQuery("UPDATE `player_characters` SET `job` = :newJob WHERE `id` = :id AND `player_id` = :playerId", {
                id: data.unitsId,
                playerId: data.unitsPlayerId,
                newJob: JSON.stringify(newJob)
              });

              if (updatedJob.meta.affectedRows > 0) {
                const playerConnected = await this.server.connectedPlayerManager.GetPlayerFromId(data.unitsPlayerId);
                if (playerConnected) { // If in the server
                  if (playerConnected.Spawned) {
                    const connectedCharacter = await this.server.characterManager.Get(playerConnected);
                    if (connectedCharacter) {
                      connectedCharacter.Job = newJob;

                      // Set your selected character fuck thing
                      playerConnected.selectedCharacter = { // Update selected character to have new job
                        id: connectedCharacter.Id,
                        firstName: connectedCharacter.firstName,
                        lastName: connectedCharacter.lastName,
                        nationality: connectedCharacter.nationality,
                        backstory: connectedCharacter.backstory,
                        dob: connectedCharacter.DOB,
                        age: connectedCharacter.Age,
                        isFemale: connectedCharacter.Female,
                        phone: connectedCharacter.Phone,
                        job: connectedCharacter.Job,
                        metadata: connectedCharacter.Metadata,
                        createdAt: connectedCharacter.CreatedAt,
                        lastUpdated: connectedCharacter.LastEdited,
                      };

                      // Empty owned characters table
                      playerConnected.characters = [];

                      // Sync all players & selected characters to all clients
                      emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

                      // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
                      await this.server.commandManager.deleteChatSuggestions(playerConnected);
                      this.server.commandManager.createChatSuggestions(playerConnected);
                      await playerConnected.TriggerEvent(Events.updateSuggestions);
                      await playerConnected.TriggerEvent(Events.updateCharacter, Object.assign({}, connectedCharacter)); // Update our character on our client (char info, job, etc)
                      await playerConnected.Notify("Character", `You've been fired from ${character.Job.label}.`, NotificationTypes.Error);
                    }
                  }
                }
              }

              await player.TriggerEvent(Events.receiveServerCB, updatedJob.meta.affectedRows > 0, data); // Returns true or false, if it sucessfully updated players job (fired them)
            }
          }
        }
      }
    }
  }

  private async CALLBACK_promoteUnit(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob()) {
            if (character.Job.Boss) {
              const tempPlayer = await this.server.playerManager.getPlayerFromId(data.unitsPlayerId);
              if (tempPlayer) {
                if (tempPlayer.Rank >= Ranks.SeniorAdmin) {
                  await player.Notify("Command Menu", "You can't promote/demote a Senior Admin or above!", NotificationTypes.Error);
                  return;
                }
              }

              const highCommand = this.server.jobManager.highCommand(character.Job.name, data.newRank);
              const newJob = new Job(character.Job.name, character.Job.label, data.newRank, highCommand, data.callsign);

              const updatedJob = await Database.SendQuery("UPDATE `player_characters` SET `job` = :newJob WHERE `id` = :id AND `player_id` = :playerId", {
                id: data.unitsId,
                playerId: data.unitsPlayerId,
                newJob: JSON.stringify(newJob)
              });

              if (updatedJob.meta.affectedRows > 0) {
                const playerConnected = await this.server.connectedPlayerManager.GetPlayerFromId(data.unitsPlayerId);
                if (playerConnected) { // If in the server
                  if (playerConnected.Spawned) {
                    const connectedCharacter = await this.server.characterManager.Get(playerConnected);
                    if (connectedCharacter) {
                      connectedCharacter.Job = newJob;

                      // Set your selected character fuck thing
                      playerConnected.selectedCharacter = { // Update selected character to have new job
                        id: connectedCharacter.Id,
                        firstName: connectedCharacter.firstName,
                        lastName: connectedCharacter.lastName,
                        nationality: connectedCharacter.nationality,
                        backstory: connectedCharacter.backstory,
                        dob: connectedCharacter.DOB,
                        age: connectedCharacter.Age,
                        isFemale: connectedCharacter.Female,
                        phone: connectedCharacter.Phone,
                        job: connectedCharacter.Job,
                        metadata: connectedCharacter.Metadata,
                        createdAt: connectedCharacter.CreatedAt,
                        lastUpdated: connectedCharacter.LastEdited,
                      };

                      // Empty owned characters table
                      playerConnected.characters = [];

                      // Sync all players & selected characters to all clients
                      emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

                      // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
                      await this.server.commandManager.deleteChatSuggestions(playerConnected);
                      this.server.commandManager.createChatSuggestions(playerConnected);
                      await playerConnected.TriggerEvent(Events.updateSuggestions);
                      await playerConnected.TriggerEvent(Events.updateCharacter, Object.assign({}, connectedCharacter)); // Update our character on our client (char info, job, etc)
                      await playerConnected.Notify("Character", `You've been fired from ${character.Job.label}.`, NotificationTypes.Error);
                    }
                  }
                }
              }

              await player.TriggerEvent(Events.receiveServerCB, updatedJob.meta.affectedRows > 0, data); // Returns true or false, if it sucessfully updated players job (fired them)
            }
          }
        }
      }
    }
  }

  private async CALLBACK_recruitPlayer(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob()) {
            if (character.Job.Boss) {
              const foundPlayer = await this.server.connectedPlayerManager.GetPlayer(data.unitsNet);
              if (foundPlayer) {
                if (foundPlayer.Spawned) {
                  const foundCharacter = await this.server.characterManager.Get(foundPlayer);
                  if (foundCharacter) {

                    // Sets their job (Controls what dept rank is FTO/High Command)
                    const highCommand = this.server.jobManager.highCommand(data.jobName, data.jobRank);
                    const updatedJob = await foundCharacter.updateJob(data.jobName, data.jobLabel, data.jobRank, highCommand, sharedConfig.jobs.defaultCallsign, false);

                    if (updatedJob !== undefined) {
                      // Set your selected character fuck thing
                      foundPlayer.selectedCharacter = { // Update selected character to have new job
                        id: foundCharacter.Id,
                        firstName: foundCharacter.firstName,
                        lastName: foundCharacter.lastName,
                        nationality: foundCharacter.nationality,
                        backstory: foundCharacter.backstory,
                        dob: foundCharacter.DOB,
                        age: foundCharacter.Age,
                        isFemale: foundCharacter.Female,
                        phone: foundCharacter.Phone,
                        job: foundCharacter.Job,
                        metadata: foundCharacter.Metadata,
                        createdAt: foundCharacter.CreatedAt,
                        lastUpdated: foundCharacter.LastEdited,
                      };

                      // Empty owned characters table
                      foundPlayer.characters = [];

                      // Sync all players & selected characters to all clients
                      emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

                      // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
                      await this.server.commandManager.deleteChatSuggestions(foundPlayer);
                      this.server.commandManager.createChatSuggestions(foundPlayer);
                      await foundPlayer.TriggerEvent(Events.updateSuggestions);

                      await foundPlayer.TriggerEvent(Events.updateCharacter, Object.assign({}, foundCharacter)); // Update our character on our client (char info, job, etc)
                      await foundPlayer.Notify("Character", `You've have been set to [${data.jobLabel}] - ${data.jobLabel}`, NotificationTypes.Info);
                    }

                    await player.TriggerEvent(Events.receiveServerCB, updatedJob, data); // Returns true or false, if it sucessfully updated players job (fired them)
                  } else {
                    await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
                  }
                } else {
                  await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
                }
              } else {
                await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
              }
            }
          }
        }
      }
    }
  }

  // Methods
  public async Disconnect(player: Player): Promise<void> {
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          const discord = await player.GetIdentifier("discord");
          const currTime = new Date();
          const timeCalculated = (currTime.getTime() / 1000) - (new Date(character.Job.statusTime).getTime() / 1000);

          if (timeCalculated > 0) {
            const dutyTime = new Playtime(timeCalculated);
            const dutyTotalTime = await dutyTime.FormatTime();

            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Red,
                title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Time On Duty**: ${dutyTotalTime}\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {
                  text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  icon_url: sharedConfig.serverLogo
                }
              }]
            }));
          } else {
            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Red,
                title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Time On Duty**: Less than zero sort this shit bby!\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {
                  text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  icon_url: sharedConfig.serverLogo
                }
              }]
            }));
          }
        }
      }
    }
  }

  public highCommand(job: string, rank: CountyRanks | PoliceRanks | StateRanks): boolean { // EDIT THESE TO DETERMINE WHAT RANK HIGH COMMAND CAN RECRUIT FROM
    if (job == Jobs.County) {
      return rank >= CountyRanks.Lieutenant;
    } else if (job == Jobs.Police) {
      return rank >= PoliceRanks.Commander;
    } else if (job == Jobs.State) {
      return rank >= StateRanks.Major;
    }
  }
}
