import { Game, Ped, Vector3, Vehicle } from "fivem-js";

import { getVehPassengers, insideVeh, Inform } from "../../utils";

import { Notification } from "../../models/ui/notification";

import { Events } from "../../../shared/enums/events/events";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { Message } from "../../../shared/models/ui/chat/message";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

import clientConfig from "../../../configs/client.json";
import sharedConfig from "../../../configs/shared.json";

class Street {
  public name: string;
  public locations: Vector3[] = [];

  constructor(name: string, locations: Vector3[]) {
    this.name = name;
    this.locations = locations;
  }
}

export class Postal {
  public code: string;
  public position: Vector3;

  constructor(code: string, position: Vector3) {
    this.code = code;
    this.position = position;
  }
}

export class GPS {
  private streetNames: string[] = [];
  private streets: Street[] = [];
  private postals: Postal[] = [];

  constructor() {
    // Events
    onNet(Events.setGPS, this.EVENT_setGPS.bind(this));
    onNet(Events.updateGPS, this.EVENT_updateGPS.bind(this));
    onNet(Events.listStreets, this.EVENT_listStreets.bind(this));
    onNet(Events.clearGPS, this.EVENT_clearGPS.bind(this));

    Inform("Vehicle | GPS Controller", "Started!");
  }

  // Methods
  public init(): void {

    // Insert street data into just name and street class arrays
    for (const [key, value] of Object.entries(clientConfig.controllers.vehicles.gps.streets)) {
      this.streetNames.push(key);
      const streetLocations: Vector3[] = [];
      for (let i = 0; i < value.length; i++) {
        streetLocations.push(new Vector3(value[i].X, value[i].Y, value[i].Z));
      }

      const street = new Street(key, streetLocations);
      this.streets.push(street);
    }
    
    for (let i = 0; i < sharedConfig.postals.length; i++) {
      const postal = new Postal(sharedConfig.postals[i].code, new Vector3(sharedConfig.postals[i].x, sharedConfig.postals[i].y, 0));
      this.postals.push(postal);
    }
  }

  private async syncGPS(vehicle: Vehicle, position: Vector3): Promise<void> {
    const vehPassengers = await getVehPassengers(vehicle);
    if (vehPassengers.length > 0) {
      emitNet(Events.syncGPS, vehPassengers, position);
    }
  }

  public async getNearestPostal(ped: Ped): Promise<Postal> {
    const pedPos = ped.Position;
    let closestPostal;
    let closestDistance;

    for (let i = 0; i < this.postals.length; i++) {
      const dist = pedPos.distance(this.postals[i].position); // Pythagorean Theorem

      if (closestPostal == undefined || dist < closestDistance) {
        closestPostal = this.postals[i];
        closestDistance = dist;
      }
    }

    return closestPostal;
  }

  // Events
  private async EVENT_setGPS(gpsLocation: string): Promise<void> {
    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
    if (inside) {
      const isStreet = isNaN(parseInt(gpsLocation));

      if (isStreet) {
        const streetNameIndex = this.streetNames.findIndex(street => street == gpsLocation);
        if (streetNameIndex !== -1) {
          const streetNameIndex = this.streets.findIndex(street => street.name == gpsLocation);
          if (streetNameIndex !== -1) {
            const randomLocation = this.streets[streetNameIndex].locations[Math.floor(Math.random() * this.streets[streetNameIndex].locations.length)];
            await this.syncGPS(currVeh, randomLocation);
            emit(Events.sendSystemMessage, new Message(`Set GPS to ${gpsLocation}.`, SystemTypes.GPS));
          } else {
            console.log("error finding index from streets array!");
          }
        } else {
          emit(Events.sendSystemMessage, new Message("Street not found!", SystemTypes.Error));
        }
      } else {
        const postalIndex = this.postals.findIndex(postal => postal.code == gpsLocation);
        if (postalIndex !== -1) {
          // SetNewWaypoint(this.postals[postalIndex].position.x, this.postals[postalIndex].position.y);
          await this.syncGPS(currVeh, this.postals[postalIndex].position);
          emit(Events.sendSystemMessage, new Message(`Set GPS to Postal (${gpsLocation}).`, SystemTypes.GPS));
        } else {
          emit(Events.sendSystemMessage, new Message("Postal not found!", SystemTypes.Error));
        }
      }
    } else {
      const notify = new Notification("GPS", "You aren't inside a vehicle!", NotificationTypes.Error);
      await notify.send();
    }
  }

  private EVENT_updateGPS(newLocation: Vector3): void {
    SetNewWaypoint(newLocation.x, newLocation.y);
  }

  private async EVENT_listStreets(): Promise<void> {
    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
    if (inside) {
      let nameString = "";

      for (let i = 0; i < this.streetNames.length; i++) {
        if (i == this.streetNames.length - 1) {
          nameString = nameString + `^0${this.streetNames[i]}^3.`;
        } else {
          nameString = nameString + `^0${this.streetNames[i]}^3, `;
        }
      }

      emit(Events.sendSystemMessage, new Message(nameString, SystemTypes.GPS));
    } else {
      const notify = new Notification("GPS", "You aren't inside a vehicle!", NotificationTypes.Error);
      await notify.send();
    }
  }

  private async EVENT_clearGPS(): Promise<void> {
    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
    if (inside) {
      if (IsWaypointActive()) {
        SetWaypointOff();
        emit(Events.sendSystemMessage, new Message("Route cleared.", SystemTypes.GPS));
      }
    } else {
      const notify = new Notification("GPS", "You aren't inside a vehicle!", NotificationTypes.Error);
      await notify.send();
    }
  }
}
