import { Server } from "../../server";
import {Dist, Inform, Log, logCommand, NumToVector3} from "../../utils";

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

export class VehicleManager {
  public server: Server;
  private vehicles: Vehicle[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    // onNet(Callbacks.editCharacter, this.CALLBACK_editVehicle.bind(this));
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
          player.Spawned = false;
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

  public async Yours(charId: number, owner: Character): Promise<boolean> {
    const charData = await Database.SendQuery("SELECT `id` FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: charId,
      playerId: owner.Id
    });

    return charData.data.length > 0;
  }

  public async Delete(charId: number, owner: Character): Promise<boolean> {
    const charData = await Database.SendQuery("DELETE FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: charId,
      playerId: owner.Id
    });

    return charData.data.length > 0;
  }
}