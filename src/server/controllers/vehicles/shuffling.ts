import { Server } from "../../server";

import { Command } from "../../models/ui/chat/command";

import { Ranks } from "../../../shared/enums/ranks";
import { Events } from "../../../shared/enums/events/events";
import { VehicleSeat } from 'fivem-js';

export class Shuffling {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public registerCommands(): void {
    new Command("shuffle", "Shuffle into the drivers seat.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const myPed = GetPlayerPed(player.Handle);
          const currVeh = GetVehiclePedIsIn(myPed, false);
          if (currVeh > 0) {
            const passengerPed = GetPedInVehicleSeat(currVeh, VehicleSeat.Passenger);
            if (myPed == passengerPed) {
              await player.TriggerEvent(Events.shuffleSeats);
            }
          }
        }
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();  
  }
}
