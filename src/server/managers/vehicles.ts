import { Server } from "../server";
import { GetHash } from "../utils";

import { Command } from "../models/ui/chat/command";;
import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { LogTypes } from "../enums/logTypes";

import { Ranks } from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { ErrorCodes } from "../../shared/enums/logging/errors";

import serverConfig from "../../configs/server.json";
import sharedConfig from "../../configs/shared.json";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { Jobs } from "../../shared/enums/jobs/jobs";

export class VehicleManager {
  public server: Server;
  
  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.entityCreated, this.EVENT_entityCreated.bind(this));
  }

  // Methods
  public async init(): Promise<void> {

    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("vehclear", "Clear the vehicles in the area", [], false, () => {
      emitNet(Events.clearWorldVehs, -1);
    }, Ranks.Admin);
  }

  private async hasPermission(myRank: Ranks, vehRanks: number[] | number): Promise<boolean> {
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
              console.log("spawning veh!", entity);
              const discord = await player.GetIdentifier("discord");

              // If LEO, Fire or EMS vehicle
              if (vehData.type == "emergency") {
                const character = await this.server.characterManager.Get(player);
                if (character) {
                  if (character.Job.name == vehData.job || player.Rank >= Ranks.Admin) {
                    if (character.Job.rank >= vehData.rank || player.Rank >= Ranks.Admin) {
                      console.log("spawn police vehicle!");
                    } else {
                      console.log("you aren't the correct rank to drive this vehicle!");

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
                      await this.server.logManager.Send(LogTypes.Kill, new WebhookMessage({
                        username: "Vehicle Logs", embeds: [{
                          color: EmbedColours.Green,
                          title: "__Created Vehicle__",
                          description: `A player has tried to spawn a vehicle, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(vehData, null, 4)}**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
                        }]
                      }));
                    }
                  } else {
                    console.log("not police!");

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
                    await this.server.logManager.Send(LogTypes.Kill, new WebhookMessage({
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
                const hasPermission = await this.hasPermission(player.Rank, vehData.rank);
                
                if (hasPermission) {
                  console.log("has spawn permission!", vehData);
                } else {
                  CancelEvent();
                  await player.Notify("Vehicles", "You aren't the correct rank to spawn this vehicle!", NotificationTypes.Error, 4000);

                  await this.server.logManager.Send(LogTypes.Kill, new WebhookMessage({
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

              await this.server.logManager.Send(LogTypes.Kill, new WebhookMessage({
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
}