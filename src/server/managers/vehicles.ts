import { VehicleSeat } from "fivem-js";

import { Server } from "../server";
import { Delay, GetHash } from "../utils";

import { Command } from "../models/ui/chat/command";;
import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { GPS } from "../controllers/vehicles/gps";
import { Seatbelt } from "../controllers/vehicles/seatbelt";

import { LogTypes } from "../enums/logTypes";

import { Ranks } from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { ErrorCodes } from "../../shared/enums/logging/errors";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { Jobs } from "../../shared/enums/jobs/jobs";
import { SystemTypes } from "../../shared/enums/ui/chat/types";
import { Message } from "../../shared/models/ui/chat/message";

import serverConfig from "../../configs/server.json";
import sharedConfig from "../../configs/shared.json";

export class VehicleManager {
  public server: Server;
  private worldVehicles: number[] = [];

  // Controllers
  private gps: GPS;
  private seatbelt: Seatbelt;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.entityCreated, this.EVENT_entityCreated.bind(this));
    onNet(Events.entityRemoved, this.EVENT_entityRemoved.bind(this));
  }

  // Methods
  public async init(): Promise<void> {
    this.gps = new GPS(this.server);
    this.seatbelt = new Seatbelt(this.server);

    this.gps.init();

    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("vehclear", "Clear the vehicles in the area", [], false, async() => {
      emitNet(Events.sendSystemMessage, -1, new Message(`All empty world vehicles are going to be deleted in ${serverConfig.vehicles.clearCommand.interval} seconds, if you wish to keep your vehicle, enter it.`, SystemTypes.Announcement));
      await Delay(serverConfig.vehicles.clearCommand.interval * 1000);
      emitNet(Events.clearWorldVehs, -1);
    }, Ranks.Admin);
  }

  private async hasPermission(myRank: Ranks, vehRanks: number[] | number, donatorAsset: boolean): Promise<boolean> {
    // If the asset is a donator package or whatever, only the donators of that rank or above, or admin and above can drive the vehicle (disables honor & trusted from accesing)
    if (donatorAsset) {
      if (vehRanks !== undefined) {
        if (typeof vehRanks == "object") {
          for (let i = 0; i < vehRanks.length; i++) {
            if (myRank == vehRanks[i] || myRank >= Ranks.Admin) {
              return true;
            }
          }
        } else if (typeof vehRanks == "number") {
          if (myRank == vehRanks || myRank >= Ranks.Admin) {
            return true;
          }
        }

        return false;
      } else {
        return true; // for fun debugging
      }
    } else { // If it's not a donator package, any rank that is equal or above can drive it.
      if (vehRanks !== undefined) {
        if (typeof vehRanks == "object") {
          for (let i = 0; i < vehRanks.length; i++) {
            if (myRank >= vehRanks[i]) {
              return true;
            }
          }
        } else if (typeof vehRanks == "number") {
          if (myRank >= vehRanks) {
            return true;
          }
        }

        return false;
      } else {
        return true; // for fun debugging
      }
    }

    return false;
  }

  // Events
  public async EVENT_entityCreated(entity: number): Promise<void> {
    // If entity actually exists
    if (DoesEntityExist(entity)) {
      // If the entity is a vehicle
      if (GetEntityType(entity) == 2) {
        const source = NetworkGetEntityOwner(entity)

        // If the owner isn't a player
        if (source === undefined) {
          CancelEvent();
        }

        const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

        if (player) {
          if (player.Spawned) {
            // Permission Checker
            const vehModel = GetEntityModel(entity);
            const vehData = serverConfig.vehicles.blacklister.general[vehModel];
            if (vehData !== undefined) {
              // console.log("spawning veh!", entity);
              const discord = await player.GetIdentifier("discord");

              // If LEO, Fire or EMS vehicle
              if (vehData.type == "emergency") {
                const character = await this.server.characterManager.Get(player);
                if (character) {
                  if (character.Job.name == vehData.job || player.Rank >= Ranks.Admin) {
                    if (character.Job.rank >= vehData.rank || player.Rank >= Ranks.Admin) {
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
                      } else if (vehData.job == Jobs.Fire) {
                        await player.Notify("Fire Department", "Your rank isn't high enough to spawn this vehicle!", NotificationTypes.Error, 4000);
                      } else if (vehData.job == Jobs.EMS) {
                        await player.Notify("Medical Services", "Your rank isn't high enough to spawn this vehicle!", NotificationTypes.Error, 4000);
                      }
    
                      // Log it via a webhook
                      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                        username: "Vehicle Logs", embeds: [{
                          color: EmbedColours.Green,
                          title: "__Created Vehicle__",
                          description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
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
                    if (vehData.job == Jobs.State) {
                      await player.Notify("State Police", "You don't have permission to spawn this vehicle!", NotificationTypes.Error, 4000);
                    } else if (vehData.job == Jobs.County) {
                      await player.Notify("Sheriffs Office", "You don't have permission to spawn this vehicle!", NotificationTypes.Error, 4000);
                    } else if (vehData.job == Jobs.Police) {
                      await player.Notify("Police Department", "You don't have permission to spawn this vehicle!!", NotificationTypes.Error, 4000);
                    } else if (vehData.job == Jobs.Fire) {
                      await player.Notify("Fire Department", "You don't have permission to spawn this vehicle!", NotificationTypes.Error, 4000);
                    } else if (vehData.job == Jobs.EMS) {
                      await player.Notify("Medical Services", "You don't have permission to spawn this vehicle!", NotificationTypes.Error, 4000);
                    }
    
                    // Log it via a webhook
                    await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                      username: "Vehicle Logs", embeds: [{
                        color: EmbedColours.Green,
                        title: "__Created Vehicle__",
                        description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                        footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
                      }]
                    }));
                  }
                }
              } else { // General vehicles
                const donatorAsset = vehData.donatorAsset !== undefined && true;
                const hasPermission = await this.hasPermission(player.Rank, vehData.rank, donatorAsset);
                
                if (hasPermission) {
                  // console.log("has spawn permission!", vehData);
                  this.worldVehicles.push(NetworkGetNetworkIdFromEntity(entity));
                } else {
                  // Cancel the event
                  CancelEvent();

                  // Delete the entity, incase cancelling the event, hasn't prevented the entity from being spawned
                  DeleteEntity(entity);
                  
                  await player.Notify("Vehicles", "You aren't the correct rank to spawn this vehicle!", NotificationTypes.Error, 4000);

                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Vehicle Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Created Vehicle__",
                      description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                      footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
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

              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Vehicle Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Entering Vehicle__",
                  description: `A player is creating a vehicle. Vehicle not found (Entity: ${entity} | Model: ${vehModel}) | Error Code: ${ErrorCodes.VehicleNotFound}\n\n**If you see this, contact <@276069255559118859>!**\n\n**Player Id**: ${player.Id}\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}`,
                  footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
                }]
              }));
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
