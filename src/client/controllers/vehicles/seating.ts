import { Game } from 'fivem-js';

import { Client } from '../../client';
import { getClosestVehicle, Inform, LoadAnim } from '../../utils';

import { Notification } from '../../models/ui/notification';

import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { Events } from '../../../shared/enums/events/events';

export class Seating {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.trySeating, this.EVENT_trySeating.bind(this));
    onNet(Events.seatCuffAnim, this.EVENT_seatCuffAnim.bind(this));

    Inform("Vehicle | Seating Controller", "Started!");
  }

  // Events
  private async EVENT_trySeating(): Promise<void> {
    const myPed = Game.PlayerPed;
    const [dist, closestVeh] = await getClosestVehicle(myPed);
    if (closestVeh !== undefined) {
      if (dist < 10.0) {
        if (dist <= 5.0) {
          console.log("closestVeh", dist, closestVeh.Handle, closestVeh.Position, closestVeh.NumberPlate);

          if (IsAnyVehicleSeatEmpty(closestVeh.Handle)) { // Test this with a 2 seat vehicle and my second client (THIS INCLUDES DRIVERS SEAT, NEED TO FIX THIS)
            const maxSeats = GetVehicleMaxNumberOfPassengers(closestVeh.Handle);
            const seats: number[] = [];
            let freeSeat;

            // Loop through all available seats and store them into our number array
            for (let i = 0; i < maxSeats; i++) {
              if (closestVeh.isSeatFree(i)) {
                seats.push(i);
              }
            }

            seats.sort(function(a, b) { // Sort the array so it's (highest -> lowest)
              return b - a;
            });

            seats.every((seat: number, index : number) => { // Loop through all seats, if any of the available seats are empty, assign that as their seat
              if (closestVeh.isSeatFree(seat)) {
                freeSeat = seat;
                console.log("set!");
                return; // Stops the for loop from running, seems to keep the return in localized scope of this for loop, and not global of the actual parent function
              }
            });


            if (freeSeat !== undefined) { // If we have found a seat, sent the vehicles net ID and the seat ID to the server
              console.log("start seating");
              emitNet(Events.seatPlayer, closestVeh.NetworkId, freeSeat);
            }
          } else {
            const notify = new Notification("Seating", "No available seats free!", NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Seating", "Vehicle is too far away!", NotificationTypes.Error);
          await notify.send();
        }
      } else {
        const notify = new Notification("Seating", "No vehicle found!", NotificationTypes.Error);
        await notify.send();
      }
    } else {
      const notify = new Notification("Seating", "No vehicle found!", NotificationTypes.Error);
      await notify.send();
    }
  }

  private async EVENT_seatCuffAnim(): Promise<void> {
    const loadedAnim = LoadAnim("mp_arresting");
    if (loadedAnim) {
      TaskPlayAnim(Game.PlayerPed.Handle, "mp_arresting", "idle", 8.0, -8.0, -1, 49, 0, false, false, false);
    }
  }
}
