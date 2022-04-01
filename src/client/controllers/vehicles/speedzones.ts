import { Game, Vector3 } from "fivem-js";

import { Client } from "../../client";
import { insideVeh, Delay } from "../../utils";

import { PolyZone } from "../../helpers/polyZone";
import { Notification } from "../../models/ui/notification";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

import clientConfig from "../../../configs/client.json";
import { Ranks } from "../../../shared/enums/ranks";

export class Speedzones {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public init(): void {
    const zones: PolyZone[] = [];
    const speedzones = clientConfig.world.speedzones;

    for (let i = 0; i < speedzones.length; i++) {
      const zone = new PolyZone({
        points: speedzones[i].points,
        options: {
          name: speedzones[i].options.name,
          debugPoly: false,
          debugGrid: false,
          gridDivisions: 30
        }
      }).create();

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
      }, 500);
    }
  }
}