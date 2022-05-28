import { Server } from '../server';
import { GetTimestamp } from '../utils';

import * as Database from './database/database';

import { LogTypes } from '../enums/logTypes';

import { Job } from '../models/jobs/job';
import { Character } from '../models/database/character';
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
import { CountyRanks } from '../../shared/enums/jobs/ranks';
import { JobLabels, Jobs } from '../../shared/enums/jobs/jobs';

import sharedConfig from '../../configs/shared.json';

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
  private policeJob: PoliceJob;

  // Controllers
  private jobBlips: JobBlips;

  constructor(server: Server) {
    this.server = server;
    
    // Callbacks
    onNet(JobCallbacks.setDuty, this.CALLBACK_setDuty.bind(this));
    onNet(JobCallbacks.updateCallsign, this.CALLBACK_updateCallsign.bind(this));
    onNet(JobCallbacks.getUnits, this.CALLBACK_getUnits.bind(this));
    onNet(JobCallbacks.fireUnit, this.CALLBACK_fireUnit.bind(this));
    onNet(JobCallbacks.recruitPlayer, this.CALLBACK_recruitPlayer.bind(this));
  }

  // Methods
  public init(): void {
    // Jobs
    this.policeJob = new PoliceJob(this.server);
    this.policeJob.init();
    
    // Controllers
    this.jobBlips = new JobBlips(this.server);
    this.jobBlips.init();
  }

  // Events

  // Callbacks
  private async CALLBACK_setDuty(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          character.Job.Status = data.state;
          if (data.state) {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} On Duty`);
            await player.Notify("Job", `You've gone on duty`, NotificationTypes.Success);
          } else {
            console.log(`Set [${player.Handle}] - ${player.GetName} | [${character.Id}] - ${character.Name} Off Duty`);
            emitNet(JobEvents.unitOffDuty, -1, player.Handle); // Remove this players on duty blip to all on duty players
            await player.Notify("Job", `You've gone off duty`, NotificationTypes.Error);
          }

          await player.TriggerEvent(JobEvents.deleteJobBlips); // Delete all on duty player blips for you
          await player.TriggerEvent(Events.receiveServerCB, true, data); // Return that they are on duty

          // Resync all players & selected characters to all clients, as your on duty status has changed
          emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.connectedPlayers));

          // Logs your clock in/out time to the discord channel
          const discord = await player.GetIdentifier("discord");
          if (data.state) {
            character.Job.statusTime = await GetTimestamp();

            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Green,
                title: `__Unit On Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked on duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Timestamp**: ${new Date(character.Job.statusTime).toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          } else {
            const currTime = new Date();
            const timeCalculated = (currTime.getTime() / 1000) - (new Date(character.Job.statusTime).getTime() / 1000);
            const dutyTime = new Playtime(timeCalculated);

            await this.server.logManager.Send(LogTypes.Timesheet, new WebhookMessage({
              username: "Timesheet Logging", embeds: [{
                color: EmbedColours.Red,
                title: `__Unit Off Duty | [${character.Job.Callsign}] - ${formatFirstName(character.firstName)}. ${character.lastName}__`,
                description: `A player has clocked off duty.\n\n**Username**: ${player.GetName}\n**Character Id**: ${character.Id}\n**Character Name**: ${character.Name}\n**Time On Duty**: ${await dutyTime.FormatTime()}\n**Timestamp**: ${currTime.toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]
            }));
          }
        }
      }
    }
  }

  private async CALLBACK_updateCallsign(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob() || character.isSAFREMSJob() || character.Job.name == "cofficer") {
            if (character.Job.Status) {
              const updatedCallsign = character.updateTypes("callsign", data.callsign);
              await player.TriggerEvent(Events.receiveServerCB, updatedCallsign, data); // Update the callsign in the DB and return it back to the client

              // log it here
            }
          }
        }
      }
    }
  }

  private async CALLBACK_getUnits(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
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

                    if (job.name == Jobs.County) {
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

              console.log("units", units);

              await player.TriggerEvent(Events.receiveServerCB, units, data); // Send back all of the passed depts units
            }
          }
        }
      }
    }
  }

  private async CALLBACK_fireUnit(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          if (character.isLeoJob()) {
            if (character.Job.Boss) {
              const newJob = new Job("civilian", "Civilian");
              const updatedJob = await Database.SendQuery("UPDATE `player_characters` SET `job` = :newJob WHERE `id` = :id AND `player_id` = :playerId", {
                id: data.unitsId,
                playerId: data.unitsPlayerId,
                newJob: JSON.stringify(newJob)
              });

              if (updatedJob.meta.affectedRows > 0) {
                const playerConnected = await this.server.connectedPlayerManager.GetPlayerFromId(data.unitsPlayerId);
                if (playerConnected) {
                  if (playerConnected.Spawned) {
                    const connectedCharacter = await this.server.characterManager.Get(playerConnected);
                    if (connectedCharacter) {
                      console.log("fired b4 job", connectedCharacter.Job, newJob);
                      connectedCharacter.Job = newJob;
                      console.log("fired after job", connectedCharacter.Job, newJob);

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
                      this.server.commandManager.createChatSuggestions(playerConnected);
                      await playerConnected.TriggerEvent(Events.updateSuggestions);
                      console.log("fired finished job", connectedCharacter.Job, newJob);

                      console.log("character data", connectedCharacter);

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
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
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
                    if (data.jobName === Jobs.County) {
                      const updatedJob = await foundCharacter.updateJob(data.jobName, JobLabels.County, data.jobRank, data.jobRank > CountyRanks.Patrol_Lieutenant, sharedConfig.jobs.defaultCallsign, false);

                      if (updatedJob) {
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
                        this.server.commandManager.createChatSuggestions(foundPlayer);
                        await foundPlayer.TriggerEvent(Events.updateSuggestions);

                        await foundPlayer.TriggerEvent(Events.updateCharacter, Object.assign({}, foundCharacter)); // Update our character on our client (char info, job, etc)
                        await foundPlayer.Notify("Character", `You've have been set to [${data.jobLabel}] - ${JobLabels.County}`, NotificationTypes.Info);
                      }

                      await player.TriggerEvent(Events.receiveServerCB, updatedJob, data); // Returns true or false, if it sucessfully updated players job (fired them)
                    }
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
}
