import { Blip, BlipColor, BlipSprite, Game, Ped, Vector3, VehicleClass } from "fivem-js";

import { Client } from "../../../client";
import { Delay, insideVeh } from "../../../utils";

import { Jobs } from "../../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";

interface ActiveUnit {
  netId: string;
  coords: Vector3;
  heading: number;
  firstName: string;
  lastName: string;
  job: Jobs;
  callsign: string;
  inVeh: boolean;
  sirenOn?: boolean
}

interface JobBlip {
  netId: number;
  blip: Blip;
  tick: number;
}

export class JobBlips {
  private client: Client;

  private createdBlips: JobBlip[] = [];
  private blipTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.refreshBlipData, this.EVENT_refreshBlipData.bind(this));
  }

  private formatFirstName(name: string): string {
    return name.slice(0, name.indexOf(name[1])); // Convers first name, to first letter (Lucy -> L)
  }

  private deleteBlips(): void {
    if (this.createdBlips.length > 0) { // If off duty and have blips created
      for (let i = 0; i < this.createdBlips.length; i++) {
        this.createdBlips[i].blip.delete();
        if (this.createdBlips[i].tick !== undefined) {
          clearTick(this.createdBlips[i].tick);
          this.createdBlips[i].tick = undefined;
        }
        
        this.createdBlips.splice(i, 1);
      }
    }
  }

  // Events
  private EVENT_refreshBlipData(units: ActiveUnit[]): void {
    if (this.client.Player.Spawned) {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == Jobs.Community) {
        if (this.client.Character.Job.status) {
          this.deleteBlips(); // delete all active blips

          for (let i = 0; i < units.length; i++) {
            const netId = parseInt(units[i].netId);
            // if (netId !== this.client.Player.NetworkId) {
              if (units[i].coords !== undefined) {
                const blipHandle = AddBlipForCoord(units[i].coords.x, units[i].coords.y, units[i].coords.z);
                const blip = new Blip(blipHandle);
                blip.IsShortRange = true;
                blip.Display = 4;
                let blipTick = undefined;

                if (units[i].inVeh) {
                  switch (units[i].job) {
                    case Jobs.Police:
                      blip.Sprite = BlipSprite.PoliceCar;
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.County:
                      blip.Sprite = BlipSprite.PoliceCar;
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.State:
                      blip.Sprite = BlipSprite.PoliceCar;
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.Fire:
                      blip.Sprite = BlipSprite.ArmoredTruck;
                      blip.Color = BlipColor.Red;
                      break;
                    case Jobs.EMS:
                      blip.Sprite = BlipSprite.Hospital;
                      blip.Color = BlipColor.Red;
                      break;
                    case Jobs.Community:
                      blip.Sprite = 58
                      blip.Color = BlipColor.Green;
                      break;
                  }

                  blip.Name = `[${units[i].callsign}] | ${this.formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                  SetBlipShowCone(blip.Handle, true)

                  if (units[i].sirenOn) {
                    if (blipTick === undefined) blipTick = setTick(async() => {
                      blip.Color = BlipColor.Red;
                      await Delay(200);
                      blip.Color = 38; // Police Blue
                      await Delay(200);
                      blip.Color = BlipColor.Red;
                      await Delay(200);
                      blip.Color = 38; // Police Blue
                      await Delay(200);
                    })
                  }
                } else {
                  blip.Sprite = BlipSprite.Standard;
                  
                  switch (units[i].job) {
                    case Jobs.Police:
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.County:
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.State:
                      blip.Color = BlipColor.Blue;
                      break;
                    case Jobs.Fire:
                      blip.Color = BlipColor.Red;
                      break;
                    case Jobs.EMS:
                      blip.Color = BlipColor.Red;
                      break;
                    case Jobs.Community:
                      blip.Color = BlipColor.Green;
                      break;
                  }

                  blip.Name = `[${units[i].callsign}] | ${this.formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                  blip.Rotation = units[i].heading;
                  blip.ShowHeadingIndicator = true;
                }

                this.createdBlips.push({
                  netId: netId,
                  blip: blip,
                  tick: blipTick
                });
              }
            // }
          }
        }
      }
    }
  }
}