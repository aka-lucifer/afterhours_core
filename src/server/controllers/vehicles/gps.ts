import { Vector3 } from "fivem-js";

import { Server } from "../../server";

import { Command } from "../../models/ui/chat/command";

import { Ranks } from "../../../shared/enums/ranks";
import { Events } from "../../../shared/enums/events/events";
import { concatArgs } from "../../../shared/utils";

interface Passenger {
  seat: number,
  playerId: number,
  netId: number
}

export class GPS {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.syncGPS, this.EVENT_syncGPS.bind(this));
  }

  // Methods
  public registerCommands(): void {
    new Command("gps", "Sets your GPS to the provided street name / postal code.", [{name: "street/postal", help: "The street name or the postal code."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source);
        if (player) {
          let location = args[0];

          // If the used location is a letter (not a postal) form all args into one string
          if (isNaN(parseInt(args[0]))) {
            location = concatArgs(0, args)
          }

          console.log("location", location);

          await player.TriggerEvent(Events.setGPS, location);
        }
      }
    }, Ranks.User);
    
    new Command("streets", "List all street names.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        await player.TriggerEvent(Events.listStreets);
      }
    }, Ranks.User);
    
    new Command("cleargps", "Clear your GPS.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        await player.TriggerEvent(Events.clearGPS);
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();  
  }

  // Events
  private async EVENT_syncGPS(vehPassengers: Passenger[], position: Vector3): Promise<void> {
    console.log("veh passengers", vehPassengers, position);
    for (let i = 0; i < vehPassengers.length; i++) {
      const player = await this.server.connectedPlayerManager.GetPlayer(vehPassengers[i].netId.toString());
      await player.TriggerEvent(Events.updateGPS, position);
    }
  }
}