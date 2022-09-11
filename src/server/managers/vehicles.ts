import { VehicleSeat } from 'fivem-js';

import { Server } from '../server';
import { Delay, GetHash } from '../utils';

import { Command } from '../models/ui/chat/command';
import WebhookMessage from '../models/webhook/discord/webhookMessage';
import { Character } from '../models/database/character';

import { GPS } from '../controllers/vehicles/gps';
import { Seatbelt } from '../controllers/vehicles/seatbelt';
import { Seating } from '../controllers/vehicles/seating';
import {Shuffling} from '../controllers/vehicles/shuffling';

import { LogTypes } from '../enums/logging';

import { Ranks } from '../../shared/enums/ranks';
import { Events } from '../../shared/enums/events/events';
import { LXEvents } from '../../shared/enums/events/lxEvents';
import { Callbacks } from '../../shared/enums/events/callbacks';
import { JobEvents } from '../../shared/enums/events/jobs/jobEvents';
import { EmbedColours } from '../../shared/enums/logging/embedColours';
import { ErrorCodes } from '../../shared/enums/logging/errors';
import { NotificationTypes } from '../../shared/enums/ui/notifications/types';
import { Jobs } from '../../shared/enums/jobs/jobs';
import { SystemTypes } from '../../shared/enums/ui/chat/types';
import { Message } from '../../shared/models/ui/chat/message';
import { formatRank } from '../../shared/utils';

import serverConfig from '../../configs/server.json';
import sharedConfig from '../../configs/shared.json';

export class VehicleManager {
  public server: Server;
  private worldVehicles: number[] = [];
  private notifiesSent: Record<string, any> = {};

  // Controllers
  private gps: GPS;
  private seatbelt: Seatbelt;
  private seating: Seating;
  private shuffling: Shuffling;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.entityCreated, this.EVENT_entityCreated.bind(this));
    onNet(LXEvents.EnteredVeh_Sv, this.EVENT_enteringVeh.bind(this));
    onNet(Events.entityRemoved, this.EVENT_entityRemoved.bind(this));
  }

  // Methods
  public async init(): Promise<void> {
    this.gps = new GPS(this.server);
    this.seatbelt = new Seatbelt(this.server);
    this.seating = new Seating(this.server);
    this.shuffling = new Shuffling(this.server);

    this.gps.init();
    this.shuffling.init();

    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("vehclear", "Clear the vehicles in the area", [], false, async() => {
      emitNet(Events.sendSystemMessage, -1, new Message(`All empty world vehicles are going to be deleted in ${serverConfig.vehicles.clearCommand.interval} seconds, if you wish to keep your vehicle, enter it.`, SystemTypes.Announcement));
      await Delay(serverConfig.vehicles.clearCommand.interval * 1000);
      emitNet(Events.clearWorldVehs, -1);
    }, Ranks.Moderator);
  }

  private async hasPermission(myRank: Ranks, vehRanks: number[] | number, donatorAsset: boolean): Promise<[boolean, number]> {
    // If the asset is a donator package or whatever, only the donators of that rank or above, or admin and above can drive the vehicle (disables honor & trusted from accesing)
    if (donatorAsset) {
      if (vehRanks !== undefined) {
        if (typeof vehRanks == "object") {
          for (let i = 0; i < vehRanks.length; i++) {
            if (myRank == vehRanks[i] || myRank >= Ranks.Admin) {
              return [true, vehRanks[i]];
            }
          }
        } else if (typeof vehRanks == "number") {
          if (myRank == vehRanks || myRank >= Ranks.Admin) {
            return [true, vehRanks];
          }
        }

        return [false, -1];
      } else {
        return [true, -1]; // for fun debugging
      }
    } else { // If it's not a donator package, any rank that is equal or above can drive it.
      if (vehRanks !== undefined) {
        if (typeof vehRanks == "object") {
          for (let i = 0; i < vehRanks.length; i++) {
            if (myRank >= vehRanks[i]) {
              return [true, vehRanks[i]];
            }
          }

          // If no match found (return first entry)
        return [false, vehRanks[0]];
        } else if (typeof vehRanks == "number") {
          if (myRank >= vehRanks) {
            return [true, vehRanks];
          } else {
            return [false, vehRanks];
          }
        }
      } else {
        return [true, 0]; // for fun debugging
      }
    }
  }

  private async hasJobPermission(character: Character, vehRanks: number[] | number): Promise<boolean> {
    if (vehRanks !== undefined) {
      if (typeof vehRanks == "object") {
        for (let i = 0; i < vehRanks.length; i++) {
          if (character.Job.rank >= vehRanks[i] || character.Owner.Rank > Ranks.Admin) {
            return true;
          }
        }
      } else if (typeof vehRanks == "number") {
        if (character.Job.rank >= vehRanks || character.Owner.Rank > Ranks.Admin) {
          return true;
        }
      }

      return false;
    } else {
      return true; // for fun debugging
    }
  }

  // Events
  private async EVENT_entityCreated(entity: number): Promise<void> {
    // If entity actually exists
    if (DoesEntityExist(entity)) {
      // If the entity is a vehicle
      if (GetEntityType(entity) == 2) {
        if (HasVehicleBeenOwnedByPlayer(entity)) { // If the creator is a player (not the server itself)
          const source = NetworkGetEntityOwner(entity)

          if (source > 0) {
            const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

            if (player) {
              if (player.Spawned) {
                // Permission Checker
                const vehModel = GetEntityModel(entity);
                const vehData = serverConfig.vehicles.blacklister[vehModel];

                if (vehData !== undefined) {
                  // console.log("spawning veh!", entity);
                  const discord = await player.GetIdentifier("discord");

                  // If LEO, Fire or EMS vehicle
                  if (vehData.type == "emergency") {
                    const character = await this.server.characterManager.Get(player);
                    if (character) {
                      const jobPerm = typeof vehData.job === "object" ? vehData.job.includes(character.Job.name) : vehData.job === character.Job.name;
                      if (jobPerm || player.Rank >= Ranks.Admin) {
                        const hasPerm = await this.hasJobPermission(character, vehData.rank);
                        if (hasPerm) {
                          // console.log("spawn police vehicle!");
                          this.worldVehicles.push(NetworkGetNetworkIdFromEntity(entity));
                        } else {
                          // console.log("you aren't the correct rank to drive this vehicle!");

                          // Cancel the event
                          CancelEvent();

                          // Delete the entity, incase cancelling the event, hasn't prevented the entity from being spawned
                          DeleteEntity(entity);

                          // Notify the player of the error
                          if (vehData.job == Jobs.State) {
                            await player.Notify("State Police", "Your rank isn't high enough to spawn this vehicle!", NotificationTypes.Error, 4000);
                          } else if (vehData.job == Jobs.County) {
                            await player.Notify("Sheriffs Office", "Your rank isn't high enough to spawn this vehicle!", NotificationTypes.Error, 4000);
                          } else if (vehData.job == Jobs.Police) {
                            await player.Notify("Police Department", "Your rank isn't high enough to spawn this vehicle!", NotificationTypes.Error, 4000);
                          }

                          // Log it via a webhook
                          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                            username: "Vehicle Logs", embeds: [{
                              color: EmbedColours.Green,
                              title: "__Created Vehicle__",
                              description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                              footer: {
                                text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                                icon_url: sharedConfig.serverLogo
                              }
                            }]
                          }));
                        }
                      } else {
                        // console.log("not police!");

                        // Cancel the event
                        CancelEvent();

                        // Delete the entity, incase cancelling the event, hasn't prevented the entity from being spawned
                        DeleteEntity(entity);

                        // Notify the player of the error
                        await player.Notify("Vehicles", "You don't have permission to spawn this vehicle!", NotificationTypes.Error, 4000);

                        // Log it via a webhook
                        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                          username: "Vehicle Logs", embeds: [{
                            color: EmbedColours.Green,
                            title: "__Created Vehicle__",
                            description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                            footer: {
                              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                              icon_url: sharedConfig.serverLogo
                            }
                          }]
                        }));
                      }
                    }
                  } else { // General vehicles
                    const donatorAsset = vehData.donatorAsset !== undefined && true;
                    const [hasPermission, rank] = await this.hasPermission(player.Rank, vehData.rank, donatorAsset);

                    if (hasPermission) {
                      // console.log("has spawn permission!", vehData);
                      this.worldVehicles.push(NetworkGetNetworkIdFromEntity(entity));
                    } else {
                      // Cancel the event
                      CancelEvent();

                      // Delete the entity, incase cancelling the event, hasn't prevented the entity from being spawned
                      DeleteEntity(entity);

                      if (this.notifiesSent[player.Handle] === undefined) {
                        this.notifiesSent[player.Handle] = true;
                        const requiredRank = formatRank(Ranks[rank]);
                        await player.Notify("Vehicles", `You aren't the correct rank to spawn this vehicle! (${requiredRank})`, NotificationTypes.Error, 4000);
                        await Delay(500);
                        this.notifiesSent[player.Handle] = undefined;
                      }

                      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                        username: "Vehicle Logs", embeds: [{
                          color: EmbedColours.Green,
                          title: "__Created Vehicle__",
                          description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                          footer: {
                            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                            icon_url: sharedConfig.serverLogo
                          }
                        }]
                      }));
                    }
                  }
                } else {
                  // MRAP Bulletproof Tyres
                  if (GetEntityModel(entity) == GetHash("mrap")) {
                    if (player) {
                      if (player.Spawned) {
                        await player.TriggerEvent(JobEvents.setupMRAP, NetworkGetNetworkIdFromEntity(entity));
                      }
                    }
                  }

                  this.worldVehicles.push(NetworkGetNetworkIdFromEntity(entity));
                  // const netId = NetworkGetNetworkIdFromEntity(entity);
                  //
                  // this.server.cbManager.TriggerClientCallback(Callbacks.getVehicleLabel, async (returnedData: any) => {
                  //   await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  //     username: "Vehicle Logs", embeds: [{
                  //       color: EmbedColours.Green,
                  //       title: "__Creating Vehicle__",
                  //       description: "A player is creating a vehicle, that isn't found in `server.json` (**Label**: " + returnedData + " | **Entity**: " + entity + " | **Model**: " + vehModel + " | **Hash**: " + GetHashKey(vehModel.toString()) + ").\n\n**Error Code**: " + ErrorCodes.VehicleNotFound + "\n\n**If you see this, contact <@276069255559118859>!**\n\n**Player Id**: " + player.Id + "\n**Player Name**: " + player.GetName + "\n**Player Rank**: " + Ranks[player.Rank],
                  //       footer: {
                  //         text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  //         icon_url: sharedConfig.serverLogo
                  //       }
                  //     }]
                  //   }));
                  //
                  //   await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  //     username: "Vehicle Logs", content: "<@276069255559118859> Vehicle found not in `server.json`\n\n**Label**: " + returnedData + "\n**Entity**: " + entity + "\n**Model**: " + vehModel + " | **Hash**: " + GetHashKey(vehModel.toString()) + ")."
                  //   }));
                  // }, netId, parseInt(player.Handle));
                }
              }
            }
          }
        }
      }
    }
  }

  private async EVENT_enteringVeh(driversNet: number, vehNet: number, vehSeat: VehicleSeat, vehName: string): Promise<void> {
    const vehicle = NetworkGetEntityFromNetworkId(vehNet);

    if (DoesEntityExist(vehicle)) {
      // If the entity is a vehicle
      if (GetEntityType(vehicle) == 2) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

        if (player) {
          if (player.Spawned) {
            const ped = GetPlayerPed(player.Handle);
            // Permission Checker
            const vehModel = GetEntityModel(vehicle);
            const vehData = serverConfig.vehicles.blacklister[vehModel];

            if (vehData !== undefined) {
              const discord = await player.GetIdentifier("discord");

              // If LEO, Fire or EMS vehicle
              if (vehData.type == "emergency") {
                const character = await this.server.characterManager.Get(player);
                if (character) {
                  const jobPerm = typeof vehData.job === "object" ? vehData.job.includes(character.Job.name) : vehData.job === character.Job.name;
                  if (jobPerm || player.Rank >= Ranks.Admin) {
                    const hasPerm = await this.hasJobPermission(character, vehData.rank);
                    if (hasPerm) {
                      // console.log("spawn police vehicle!");
                      this.worldVehicles.push(NetworkGetNetworkIdFromEntity(vehicle));
                    } else {
                      if (vehSeat === VehicleSeat.Driver) {
                        // Make you leave the vehicle (since you aren't in the vehicle, basically just clears the task)
                        ClearPedTasksImmediately(ped);

                        // Notify the player of the error
                        if (vehData.job == Jobs.State) {
                          await player.Notify("State Police", "Your rank isn't high enough to drive this vehicle!", NotificationTypes.Error, 4000);
                        } else if (vehData.job == Jobs.County) {
                          await player.Notify("Sheriffs Office", "Your rank isn't high enough to drive this vehicle!", NotificationTypes.Error, 4000);
                        } else if (vehData.job == Jobs.Police) {
                          await player.Notify("Police Department", "Your rank isn't high enough to drive this vehicle!", NotificationTypes.Error, 4000);
                        }

                        // Log it via a webhook
                        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                          username: "Vehicle Logs", embeds: [{
                            color: EmbedColours.Green,
                            title: "__Entering Vehicle__",
                            description: `A player has tried to enter a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                            footer: {
                              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                              icon_url: sharedConfig.serverLogo
                            }
                          }]
                        }));
                      }
                    }
                  } else {
                    if (vehSeat === VehicleSeat.Driver) {
                      // Make you leave the vehicle (since you aren't in the vehicle, basically just clears the task)
                      TaskLeaveVehicle(ped, vehicle, 0);

                      // Notify the player of the error
                      if (vehData.job == Jobs.State) {
                        await player.Notify("State Police", "You don't have permission to drive this vehicle!", NotificationTypes.Error, 4000);
                      } else if (vehData.job == Jobs.County) {
                        await player.Notify("Sheriffs Office", "You don't have permission to drive this vehicle!", NotificationTypes.Error, 4000);
                      } else if (vehData.job == Jobs.Police) {
                        await player.Notify("Police Department", "You don't have permission to drive this vehicle!!", NotificationTypes.Error, 4000);
                      }

                      // Log it via a webhook
                      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                        username: "Vehicle Logs", embeds: [{
                          color: EmbedColours.Green,
                          title: "__Created Vehicle__",
                          description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                          footer: {
                            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                            icon_url: sharedConfig.serverLogo
                          }
                        }]
                      }));
                    }
                  }
                }
              } else { // General vehicles
                const donatorAsset = vehData.donatorAsset !== undefined && true;
                const [hasPermission, rank] = await this.hasPermission(player.Rank, vehData.rank, donatorAsset);

                if (hasPermission) {
                  // console.log("has spawn permission!", vehData);
                  this.worldVehicles.push(NetworkGetNetworkIdFromEntity(vehicle));
                } else {
                  // Make you leave the vehicle (since you aren't in the vehicle, basically just clears the task)
                  ClearPedTasksImmediately(ped);

                  if (this.notifiesSent[player.Handle] === undefined) {
                    this.notifiesSent[player.Handle] = true;
                    const requiredRank = formatRank(Ranks[rank]);
                    await player.Notify("Vehicles", `You aren't the correct rank to spawn this vehicle! (${requiredRank})`, NotificationTypes.Error, 4000);
                    await Delay(500);
                    this.notifiesSent[player.Handle] = undefined;
                  }

                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Vehicle Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Entering Vehicle__",
                      description: `A player has tried to enter a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                }
              }
            } else {
              const netId = NetworkGetNetworkIdFromEntity(vehicle);
              this.worldVehicles.push(netId);

              // this.server.cbManager.TriggerClientCallback(Callbacks.getVehicleLabel, async (returnedData: any) => {
              //   await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
              //     username: "Vehicle Logs", embeds: [{
              //       color: EmbedColours.Green,
              //       title: "__Entering Vehicle__",
              //       description: "A player is entering a vehicle, that isn't found in `server.json` (**Label**: " + returnedData + " | **Entity**: " + vehicle + " | **Model**: " + vehModel + " | **Hash**: " + GetHashKey(vehModel.toString()) + ").\n\n**Error Code**: " + ErrorCodes.VehicleNotFound + "\n\n**If you see this, contact <@276069255559118859>!**\n\n**Player Id**: " + player.Id + "\n**Player Name**: " + player.GetName + "\n**Player Rank**: " + Ranks[player.Rank],
              //       footer: {
              //         text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              //         icon_url: sharedConfig.serverLogo
              //       }
              //     }]
              //   }));
              //
              //   await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
              //     username: "Vehicle Logs", content: "<@276069255559118859> Vehicle found not in `server.json`\n\n**Label**: " + returnedData + "\n**Entity**: " + vehicle + "\n**Model**: " + vehModel + " | **Hash**: " + GetHashKey(vehModel.toString()) + ")."
              //   }));
              // }, netId, parseInt(player.Handle));
            }
          }
        }
      }
    }
  }

  public EVENT_entityRemoved(entity: number): void {
    // If entity actually exists
    if (DoesEntityExist(entity)) {
      // If the entity is a vehicle
      if (GetEntityType(entity) == 2) {
        // If vehicle exists in world vehicles array
        const vehIndex = this.worldVehicles.findIndex(vehicle => vehicle == entity);

        if (vehIndex !== -1) {
          // Remove from array and log it
          this.worldVehicles.splice(vehIndex, 1);
          // console.log(`Removed veh from world vehicle manager (${entity} | ${GetEntityModel(entity)})`);
        }
      }
    }
  }
}
