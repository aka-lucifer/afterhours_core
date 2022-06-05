import { Game, Vector3 } from "fivem-js";

import { Client } from "../../client";
import { insideVeh, Delay, Inform } from "../../utils";

import { PolyZone } from "../../helpers/polyZone";

import { Notification } from "../../models/ui/notification";

import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Ranks } from "../../../shared/enums/ranks";

import clientConfig from "../../../configs/client.json";

interface Speedzone {
  name: string,
  points: {x: number, y: number}[];
}

export class Speedzones {
  private client: Client;

  private speedzoneLocations: Speedzone[] = [];
  private zones: PolyZone[] = [];

  private createdZones: boolean = false;

  constructor(client: Client) {
    this.client = client;

    Inform("Vehicle | Speedzones Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.createdZones;
  }

  // Methods
  public init(): void {
    const speedzones = clientConfig.controllers.vehicles.speedzones;

    for (let i = 0; i < speedzones.length; i++) {
      this.speedzoneLocations.push({
        name: speedzones[i].options.name,
        points: speedzones[i].points
      });
    }
  }

  public start(): void {
    if (!this.createdZones) {
      // console.log("create speedzones!");

      for (let i = 0; i < this.speedzoneLocations.length; i++) {
        // console.log("Location", this.speedzoneLocations[i].name, this.speedzoneLocations[i].points);
        const zone = new PolyZone({
          points: this.speedzoneLocations[i].points,
          options: {
            name: this.speedzoneLocations[i].name,
            debugPoly: false,
            debugGrid: false,
            gridDivisions: 30
          }
        }).create();

        this.zones.push(zone);

        zone.onPlayerInOut(async(isInside: boolean, pedPos: Vector3) => {
          if (isInside) {
            const [currVeh, inside] = await insideVeh(Game.PlayerPed);
            if (inside) {
              if (this.client.player.Rank < Ranks.Admin) {
                if (this.client.Player.Spawned) {
                  const leoJob = this.client.Character.isLeoJob();
                  if (!leoJob) {
                    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
                    if (inside) {
                      const currMph = Math.ceil(currVeh.Speed * 2.236936);
                      if (currMph >= 50) {
                        currVeh.IsPositionFrozen = true;
                        await Delay(500);
                        const notify = new Notification("Speed Zones", "Your vehicle was stopped as it was detected speeding through known troll zones, driving at high speeds.", NotificationTypes.Info, 5000, true);
                        await notify.send();
                        currVeh.IsPositionFrozen = false;
                      }
                    }
                  } else if (leoJob && !this.client.Character.job.status) {
                    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
                    if (inside) {
                      const currMph = Math.ceil(currVeh.Speed * 2.236936);
                      if (currMph >= 50) {
                        const notify = new Notification("Speed Zones", "Your vehicle was stopped as it was detected speeding through known troll zones, driving at high speeds.", NotificationTypes.Info, 5000, true);
                        currVeh.IsPositionFrozen = true;
                        await notify.send();
                        await Delay(500);
                        currVeh.IsPositionFrozen = false;
                      }
                    }
                  }
                }
              } else {
                console.log("speedzone dont apply to you as your staff!");
              }
            }
          }
        }, 1000);

        if (i == (this.speedzoneLocations.length - 1)) {
          this.createdZones = true;
        }
      }
    } else {
      console.log("Can't run 'start()' method on Speedzones, as it's already started!");
    }
  }

  public stop(): void {
    if (this.createdZones) {
      for (let i = 0; this.zones.length; i++) {
        const zoneName = this.zones[i].options.name;
        this.zones[i].destroy();
  
        // console.log(`destroyed speedzone (${i} | ${zoneName})!`);
        
        if (i == (this.zones.length - 1)) {
          // console.log("clear zones array as on final entry!");
          this.zones = [];
          this.createdZones = false;
        }
      }
    } else {
      console.log("Can't run 'stop()' method on Speedzones, as it's not started!");
    }
  }
}
