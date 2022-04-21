import { Vector3 } from "fivem-js";
import { Events } from "../../../shared/enums/events/events";
import { Server } from "../../server";

interface Passenger {
  seat: number,
  playerId: number,
  netId: number
}

export class Seatbelt {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.ejectPassengers, this.EVENT_ejectPassengers.bind(this));
    onNet(Events.harmPassengers, this.EVENT_harmPassengers.bind(this));
  }

  // Events
  private async EVENT_ejectPassengers(passengers: Passenger[], velocitySpeed: Vector3): Promise<void> {
    console.log("eject all passengers", passengers);
    for (let i = 0; i < passengers.length; i++) {
      const player = await this.server.connectedPlayerManager.GetPlayer(passengers[i].netId.toString());
      if (player) {
        const playerStates = Player(player.Handle);

        if (!playerStates.state.seatbelt) {
          console.log(`eject (${player.Handle}) from the vehicle, as they don't have seatbelt toggled!`);
          await player.TriggerEvent(Events.ejectFromVeh, velocitySpeed);
        } else {
          console.log(`don't eject (${player.Handle}) from the vehicle, as they have seatbelt toggled!`);
        }
      }
    }
  }
  
  private async EVENT_harmPassengers(passengers: Passenger[]): Promise<void> {
    console.log("harm all passengers", passengers);
    for (let i = 0; i < passengers.length; i++) {
      const player = await this.server.connectedPlayerManager.GetPlayer(passengers[i].netId.toString());
      if (player) {
        const playerStates = Player(player.Handle);

        if (playerStates.state.seatbelt) {
          console.log(`harm (${player.Handle}) as they have seatbelt toggled!`);
          await player.TriggerEvent(Events.harmPassenger);
        } else {
          console.log(`don't harm (${player.Handle}) as they don't have seatbelt toggled!`);
        }
      }
    }
  }
}
