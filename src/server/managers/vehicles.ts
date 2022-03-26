import { Server } from "../server";
import {Dist, GetTimestamp, Inform, Log, logCommand, NumToVector3} from "../utils";

import { LogTypes } from "../enums/logTypes";

import { Character } from "../models/database/character";
import { Vehicle } from "../models/database/vehicle";
import WebhookMessage from "../models/webhook/discord/webhookMessage";
import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";

import * as Database from "./database/database";

import sharedConfig from "../../configs/shared.json";
import serverConfig from "../../configs/server.json";
import { Ranks } from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { Callbacks } from "../../shared/enums/events/callbacks";
import { formatSQLDate } from "../../shared/utils";
import { EmbedColours } from "../../shared/enums/logging/embedColours";

export class VehicleManager {
  public server: Server;
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.createVehicle, this.CALLBACK_createVehicle.bind(this));
    onNet(Callbacks.editVehicle, this.CALLBACK_editVehicle.bind(this));
    onNet(Callbacks.deleteVehicle, this.CALLBACK_deleteVehicle.bind(this));
  }

  // Methods
  public async init(): Promise<void> {

    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("vehicles", "Edit your characters vehicles.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.displayVehicles);
        }
      }
    }, Ranks.User);
  }

  public async GetCharVehicles(character: Character): Promise<Vehicle[]> {
    const charVehicles: Vehicle[] = [];

    for (let i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].Owner == character.Id) {
        charVehicles.push(this.vehicles[i]);
      }
    }

    return charVehicles;
  }

  public async getVehFromId(id: number): Promise<Vehicle> {
    const vehIndex = this.vehicles.findIndex(vehicle => vehicle.Id == id);
    if (vehIndex !== -1) {
      return this.vehicles[vehIndex];
    }
  }

  public async yourVehicle(id: number, owner: Character): Promise<boolean> {
    const vehIndex = this.vehicles.findIndex(vehicle => vehicle.Id == id && vehicle.Owner == owner.Id);
    return vehIndex !== -1;
  }

  public async create(owner: Character, label: string, model: string, type: string, colour: string, plate: string): Promise<[number, boolean]> {
    const newVehicle = await Database.SendQuery("INSERT INTO `character_vehicles` (`character_id`, `label`, `model`, `type`, `colour`, `plate`) VALUES (:characterId, :label, :model, :type, :colour, :plate)", {
      characterId: owner.Id,
      label: label,
      model: model,
      type: type,
      colour: colour,
      plate: plate
    });
    
    if (newVehicle.meta.affectedRows > 0) {
      const insertId = newVehicle.meta.insertId;
      return [insertId, true];
    } else {
      return [undefined, false];
    }
  }

  public async edit(id: number, plate: string, owner: Character): Promise<boolean> {
    const updatedVeh = await Database.SendQuery("UPDATE `character_vehicles` SET `plate` = :newPlate WHERE `id` = :id AND `character_id` = :ownerId", {
      id: id,
      newPlate: plate,
      ownerId: owner.Id
    });

    return updatedVeh.meta.affectedRows > 0;
  }

  public async deleted(id: number, owner: Character): Promise<boolean> {
    const vehData = await Database.SendQuery("DELETE FROM `character_vehicles` WHERE `id` = :id AND `character_id` = :ownerId LIMIT 1", {
      id: id,
      ownerId: owner.Id
    });

    if (vehData.meta.affectedRows > 0) {
      const vehIndex = this.vehicles.findIndex(vehicle => vehicle.Id == id);

      if (vehIndex !== -1) {
        this.vehicles.splice(vehIndex, 1);
      }

      return true;
    } else {
      return false;
    }
  }

  // Callbacks
  private async CALLBACK_createVehicle(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          const vehData = data.data;
          const newVehicle = new Vehicle(character.Id, vehData.label, vehData.model, vehData.type, vehData.colour, vehData.plate)
          const [insertId, inserted] = await this.create(character, newVehicle.Label, newVehicle.Model, newVehicle.Type, newVehicle.Colour, newVehicle.Plate);

          if (inserted) {
            vehData.id = insertId;
            vehData.registeredOn = await GetTimestamp();

            newVehicle.Id = insertId;
            newVehicle.Registered = vehData.registeredOn;
            this.vehicles.push(newVehicle);

            await player.TriggerEvent(Events.receiveServerCB, vehData, data); // Update the UI to close and disable NUI focus

            await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicles Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Vehicle Registered__",
              description: `A player has registered a new vehicle.\n\n**Character ID**: ${character.Id}\n**Character Name**: ${character.Name}\n**Character Nationality**: ${character.Nationality}\n**Character Age**: ${character.Age}\n**Character Gender**: ${character.Gender}\n**Name**: ${newVehicle.Label}\n**Model**: ${newVehicle.Model}\n**Type**: ${newVehicle.Type}\n**Colour**: ${newVehicle.Colour}\n**Plate**: ${newVehicle.Plate}\n**Registered On**: ${new Date(newVehicle.Registered).toUTCString()}`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]}));
          }
        }
      }
    }
  }

  private async CALLBACK_editVehicle(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          const vehData = data.data;

          if (vehData.id !== undefined && vehData.id > 0) {
            const vehicle = await this.getVehFromId(vehData.id);
            const yourVeh = await this.yourVehicle(vehicle.Id, character);

            if (yourVeh) {
              const updatedVeh = await this.edit(vehData.id, vehData.plate, character);
              if (updatedVeh) {
                vehicle.Plate = vehData.plate;
                await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicles Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Vehicle Edited__",
                  description: `A player has edited one of their vehicles.\n\n**Name**: ${vehicle.Label}\n**Model**: ${vehicle.Model}\n**Type**: ${vehicle.Type}\n**Colour**: ${vehicle.Colour}\n**Old Plate**: ${vehData.oldPlate}\n**New Plate**: ${vehicle.Plate}\n**Registered On**: ${new Date(vehicle.Registered).toUTCString()}`,
                  footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
                }]}));
              }
            } else {
              const ban = new Ban(player.Id, player.HardwareId, "Trying to edit someone else's vehicle (Lua Executor)", player.Id);
              await ban.save();
              ban.drop();
              
              const discord = await player.GetIdentifier("discord");
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicle Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Attempted Vehicle Edit__",
                description: `A player has tried to edit someone else's vehicle.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Name**: ${vehicle.Label}\n**Model**: ${vehicle.Model}\n**Type**: ${vehicle.Type}\n**Colour**: ${vehicle.Colour}\n**Plate**: ${vehicle.Plate}\n**Registered On**: ${new Date(vehicle.Registered).toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]}));
            }
          }
        }
      }
    }
  }

  private async CALLBACK_deleteVehicle(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {
          const vehData = data.data;

          if (vehData.id !== undefined && vehData.id > 0) {
            const vehicle = await this.getVehFromId(vehData.id);
            const yourVeh = await this.yourVehicle(vehicle.Id, character);

            if (yourVeh) {
              const deletedVeh = await this.deleted(vehData.id, character);
              if (deletedVeh) {
                await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicles Logs", embeds: [{
                  color: EmbedColours.Red,
                  title: "__Vehicle Deleted__",
                  description: `A player has deleted one of their vehicles.\n\n**Name**: ${vehicle.Label}\n**Model**: ${vehicle.Model}\n**Type**: ${vehicle.Type}\n**Colour**: ${vehicle.Colour}\n**Plate**: ${vehicle.Plate}\n**Registered On**: ${new Date(vehicle.Registered).toUTCString()}`,
                  footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
                }]}));
              }
            } else {
              const ban = new Ban(player.Id, player.HardwareId, "Trying to edit someone else's vehicle (Lua Executor)", player.Id);
              await ban.save();
              ban.drop();
              
              const discord = await player.GetIdentifier("discord");
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicle Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Attempted Vehicle Deletion__",
                description: `A player has tried to delete someone else's vehicle.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Name**: ${vehicle.Label}\n**Model**: ${vehicle.Model}\n**Type**: ${vehicle.Type}\n**Colour**: ${vehicle.Colour}\n**Plate**: ${vehicle.Plate}\n**Registered On**: ${new Date(vehicle.Registered).toUTCString()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]}));
            }
          }
        }
      }
    }
  }
}