import { Blip, BlipColor, BlipSprite, Game, Ped, Vector3, VehicleClass, World } from 'fivem-js';

import { Client } from "../../../client";
import { Delay, Inform, insideVeh } from '../../../utils';

import { Jobs } from "../../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { formatFirstName } from "../../../../shared/utils";

interface ActiveUnit {
  netId: string;
  coords: Vector3;
  heading: number;
  firstName: string;
  lastName: string;
  job: Jobs;
  callsign: string;
  status: boolean;
  inVeh: boolean;
  sirenOn?: boolean;
  vehType?: string;
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
    onNet(JobEvents.deleteOffDutyUnit, this.EVENT_deleteOffDutyUnit.bind(this));
    onNet(JobEvents.deleteJobBlips, this.EVENT_deleteJobBlips.bind(this));

    Inform("Unit Blips | Jobs Controller", "Started!");
  }

  // Events
  private async EVENT_refreshBlipData(units: ActiveUnit[]): Promise<void> {
    if (this.client.Player.Spawned) {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == Jobs.Community) {
        if (this.client.Character.Job.status) {
          // await this.deleteBlips(); // delete all active blips

          // console.log("blips length", this.createdBlips.length);

          for (let i = 0; i < units.length; i++) {
            const netId = parseInt(units[i].netId);

            if (netId !== this.client.Player.NetworkId) {
              if (units[i].coords !== undefined) {
                const blipIndex = this.createdBlips.findIndex(blip => blip.netId == netId);

                if (blipIndex === -1) {
                  const blip = World.createBlip(new Vector3(units[i].coords.x, units[i].coords.y, units[i].coords.z));
                  blip.IsShortRange = true;
                  blip.Display = 4;
                  let blipTick = undefined;

                  if (units[i].inVeh) {
                    if (units[i].vehType == "automobile") {
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
                    } else if (units[i].vehType == "bike") {
                      switch (units[i].job) {
                        case Jobs.Police:
                          blip.Sprite = 348;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.County:
                          blip.Sprite = 348;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.State:
                          blip.Sprite = 348;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.Fire:
                          blip.Sprite = 348;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.EMS:
                          blip.Sprite = 348;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.Community:
                          blip.Sprite = 58
                          blip.Color = BlipColor.Green;
                          break;
                      }
                    } else if (units[i].vehType == "heli") {
                      switch (units[i].job) {
                        case Jobs.Police:
                          blip.Sprite = BlipSprite.PoliceHelicopter;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.County:
                          blip.Sprite = BlipSprite.PoliceHelicopter;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.State:
                          blip.Sprite = BlipSprite.PoliceHelicopter;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.Fire:
                          blip.Sprite = BlipSprite.PoliceHelicopter;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.EMS:
                          blip.Sprite = BlipSprite.PoliceHelicopter;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.Community:
                          blip.Sprite = 58
                          blip.Color = BlipColor.Green;
                          break;
                      }
                    } else if (units[i].vehType == "boat") {
                      switch (units[i].job) {
                        case Jobs.Police:
                          blip.Sprite = BlipSprite.Speedboat;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.County:
                          blip.Sprite = BlipSprite.Speedboat;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.State:
                          blip.Sprite = BlipSprite.Speedboat;
                          blip.Color = BlipColor.Blue;
                          break;
                        case Jobs.Fire:
                          blip.Sprite = BlipSprite.Speedboat;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.EMS:
                          blip.Sprite = BlipSprite.Speedboat;
                          blip.Color = BlipColor.Red;
                          break;
                        case Jobs.Community:
                          blip.Sprite = 58
                          blip.Color = BlipColor.Green;
                          break;
                      }
                    }

                    blip.Name = `[${units[i].callsign}] | ${formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                    blip.Rotation = units[i].heading;
                    blip.ShowHeadingIndicator = true;

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

                    blip.Name = `[${units[i].callsign}] | ${formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                    blip.Rotation = units[i].heading;
                    blip.ShowHeadingIndicator = true;
                  }

                  this.createdBlips.push({
                    netId: netId,
                    blip: blip,
                    tick: blipTick
                  });
                } else {
                  const blipData = this.createdBlips[blipIndex];

                  if (units[i].status) { // If the person is still on duty
                    const foundBlip = new Blip(blipData.blip.Handle); // see if this fixes stupid bug
                    foundBlip.Position = units[i].coords;

                    if (units[i].inVeh) {
                      if (units[i].vehType == "automobile") {
                        switch (units[i].job) {
                          case Jobs.Police:
                            foundBlip.Sprite = BlipSprite.PoliceCar;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.County:
                            foundBlip.Sprite = BlipSprite.PoliceCar;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.State:
                            foundBlip.Sprite = BlipSprite.PoliceCar;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.Fire:
                            foundBlip.Sprite = BlipSprite.ArmoredTruck;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.EMS:
                            foundBlip.Sprite = BlipSprite.Hospital;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.Community:
                            foundBlip.Sprite = 58
                            foundBlip.Color = BlipColor.Green;
                            break;
                        }
                      } else if (units[i].vehType == "bike") {
                        switch (units[i].job) {
                          case Jobs.Police:
                            foundBlip.Sprite = 348;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.County:
                            foundBlip.Sprite = 348;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.State:
                            foundBlip.Sprite = 348;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.Fire:
                            foundBlip.Sprite = 348;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.EMS:
                            foundBlip.Sprite = 348;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.Community:
                            foundBlip.Sprite = 58
                            foundBlip.Color = BlipColor.Green;
                            break;
                        }
                      } else if (units[i].vehType == "heli") {
                        switch (units[i].job) {
                          case Jobs.Police:
                            foundBlip.Sprite = BlipSprite.PoliceHelicopter;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.County:
                            foundBlip.Sprite = BlipSprite.PoliceHelicopter;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.State:
                            foundBlip.Sprite = BlipSprite.PoliceHelicopter;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.Fire:
                            foundBlip.Sprite = BlipSprite.PoliceHelicopter;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.EMS:
                            foundBlip.Sprite = BlipSprite.PoliceHelicopter;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.Community:
                            foundBlip.Sprite = 58
                            foundBlip.Color = BlipColor.Green;
                            break;
                        }
                      } else if (units[i].vehType == "boat") {
                        switch (units[i].job) {
                          case Jobs.Police:
                            foundBlip.Sprite = BlipSprite.Speedboat;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.County:
                            foundBlip.Sprite = BlipSprite.Speedboat;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.State:
                            foundBlip.Sprite = BlipSprite.Speedboat;
                            foundBlip.Color = BlipColor.Blue;
                            break;
                          case Jobs.Fire:
                            foundBlip.Sprite = BlipSprite.Speedboat;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.EMS:
                            foundBlip.Sprite = BlipSprite.Speedboat;
                            foundBlip.Color = BlipColor.Red;
                            break;
                          case Jobs.Community:
                            foundBlip.Sprite = 58
                            foundBlip.Color = BlipColor.Green;
                            break;
                        }
                      }

                      foundBlip.Name = `[${units[i].callsign}] | ${formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                      foundBlip.Rotation = units[i].heading;
                      foundBlip.ShowHeadingIndicator = true;

                      if (units[i].sirenOn && units[i].inVeh) {
                        if (blipData.tick === undefined) blipData.tick = setTick(async() => {
                          foundBlip.Color = BlipColor.Red;
                          await Delay(200);
                          foundBlip.Color = 38; // Police Blue
                          await Delay(200);
                          foundBlip.Color = BlipColor.Red;
                          await Delay(200);
                          foundBlip.Color = 38; // Police Blue
                          await Delay(200);
                        })
                      } else {
                        if (blipData.tick !== undefined) {
                          clearTick(blipData.tick);
                          blipData.tick = undefined;
                        }
                      }
                    } else {
                      if (blipData.tick !== undefined) {
                        clearTick(blipData.tick);
                        blipData.tick = undefined;
                      }

                      foundBlip.Sprite = BlipSprite.Standard;
                      
                      switch (units[i].job) {
                        case Jobs.Police:
                          foundBlip.Color = BlipColor.Blue;
                          break;
                        case Jobs.County:
                          foundBlip.Color = BlipColor.Blue;
                          break;
                        case Jobs.State:
                          foundBlip.Color = BlipColor.Blue;
                          break;
                        case Jobs.Fire:
                          foundBlip.Color = BlipColor.Red;
                          break;
                        case Jobs.EMS:
                          foundBlip.Color = BlipColor.Red;
                          break;
                        case Jobs.Community:
                          foundBlip.Color = BlipColor.Green;
                          break;
                      }

                      foundBlip.Name = `[${units[i].callsign}] | ${formatFirstName(units[i].firstName)}. ${units[i].lastName}`;
                      foundBlip.Rotation = units[i].heading;
                      foundBlip.ShowHeadingIndicator = true;
                    }
                  } else {
                    blipData.blip.delete();
                    this.createdBlips.splice(blipIndex, 1);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private EVENT_deleteOffDutyUnit(netId: number): void { //
    const blipIndex = this.createdBlips.findIndex(blip => blip.netId == netId);
    // console.log("blipindex from off duty!", netId, blipIndex);
    if (blipIndex !== -1) {
      // console.log("delete duty blip for ", netId, " as they have gone off duty!");
      this.createdBlips[blipIndex].blip.delete();

      if (this.createdBlips[blipIndex].tick !== undefined) {
        clearTick(this.createdBlips[blipIndex].tick);
        this.createdBlips[blipIndex].tick = undefined;
      }

      this.createdBlips.splice(blipIndex, 1);
    }
  }

  private EVENT_deleteJobBlips(): void {
    // console.log("deleting all job unit blips as you've gone off duty!");
    for (let i = 0; this.createdBlips.length; i++) {
      this.createdBlips[i].blip.delete();

      if (this.createdBlips[i].tick !== undefined) {
        clearTick(this.createdBlips[i].tick);
        this.createdBlips[i].tick = undefined;
      }

      this.createdBlips.splice(i, 1);
    }
  }
}
