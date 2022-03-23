import { Server } from "../../server";
import {Dist, Inform, Log, logCommand, NumToVector3} from "../../utils";

import { LogTypes } from "../../enums/logTypes";

import { Character } from "../../models/database/character";
import { Vehicle } from "../../models/database/vehicle";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";
import { Command } from "../../models/ui/chat/command";
import { Ban } from "../../models/database/ban";

import * as Database from "../database/database";

import sharedConfig from "../../../configs/shared.json";
import serverConfig from "../../../configs/server.json";
import { Ranks } from "../../../shared/enums/ranks";
import { Events } from "../../../shared/enums/events/events";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import { formatSQLDate } from "../../../shared/utils";
import { EmbedColours } from "../../../shared/enums/embedColours";

export class VehicleManager {
  public server: Server;
  private vehicles: Vehicle[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.editVehicle, this.CALLBACK_editVehicle.bind(this));
  }

  // Get Requests
  public get GetVehicles(): Vehicle[] {
    return this.vehicles;
  }

  // Methods
  public async init(): Promise<void> {
    const vehicles = await Database.SendQuery("SELECT * FROM `character_vehicles`", {});
    
    for (let i = 0; i < vehicles.data.length; i++) {
      const timestamp = formatSQLDate(new Date(vehicles.data[i].registered_on));
      const vehicle = new Vehicle(vehicles.data[i].character_id, vehicles.data[i].label, vehicles.data[i].model, vehicles.data[i].type, vehicles.data[i].colour, vehicles.data[i].plate, timestamp);
      vehicle.Id = vehicles.data[i].id;

      this.vehicles.push(vehicle);
    }

    console.log(`Server Registered Vehicles | ${JSON.stringify(this.vehicles)}`);

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

  public async yourVehicle(id: number): Promise<boolean> {
    const vehIndex = this.vehicles.findIndex(vehicle => vehicle.Id == id);
    return vehIndex !== -1;
  }

  public async edit(id: number, plate: string): Promise<boolean> {
    const updatedVeh = await Database.SendQuery("UPDATE `character_vehicles` SET `plate` = :newPlate WHERE `id` = :id", {
      id: id,
      newPlate: plate
    });

    return updatedVeh.meta.affectedRows > 0;
  }

  public async Delete(charId: number, owner: Character): Promise<boolean> {
    const charData = await Database.SendQuery("DELETE FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: charId,
      playerId: owner.Id
    });

    return charData.data.length > 0;
  }

  // Callbacks
  private async CALLBACK_editVehicle(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const vehData = data.data;
        if (vehData.id !== undefined && vehData.id > 0) {
          const vehicle = await this.getVehFromId(vehData.id);
          const updatedVeh = await this.edit(vehData.id, vehData.plate);
          if (updatedVeh) {
            vehicle.Plate = vehData.plate;
            await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

            await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Vehicles Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Vehicle Edited__",
              description: `A player has edited one of their vehicles.\n\n**Name**: ${vehicle.Label}\n**Model**: ${vehicle.Model}\n**Type**: ${vehicle.Type}\n**Colour**: ${vehicle.Colour}\n**Old Plate**: ${vehData.oldPlate}\n**New Plate**: ${vehicle.Plate}\n**Registered At**: ${new Date(vehicle.Registered).toUTCString()}`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]}));
            // webhook update plate
          }
        }
      }
    }
  }
}