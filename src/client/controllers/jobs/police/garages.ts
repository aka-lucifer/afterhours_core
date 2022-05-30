import { Blip, Color, Control, Game, InputMode, Screen, Vector3, Vehicle, VehicleSeat, World } from 'fivem-js';

import { Client } from '../../../client';
import { createVeh, Delay, Inform } from '../../../utils';

import { Menu } from '../../../models/ui/menu/menu';
import { Submenu } from '../../../models/ui/menu/submenu';

import { MarkerData } from '../../../interfaces/ui/marker';
import { BlipData } from '../../../interfaces/ui/blip';

import { MenuPositions } from '../../../../shared/enums/ui/menu/positions';
import { JobLabels, Jobs } from '../../../../shared/enums/jobs/jobs';
import { VehData } from '../../../../shared/interfaces/vehicle';

import clientConfig from '../../../../configs/client.json';
import serverConfig from '../../../../configs/server.json';
import { Ranks } from '../../../../shared/enums/ranks';
import { spawn } from 'child_process';
import { Notification } from '../../../models/ui/notification';
import { NotificationTypes } from '../../../../shared/enums/ui/notifications/types';

interface SpawnLocation {
  x: number,
  y: number,
  z: number,
  h: number
}

interface Garage {
  coords: Vector3,
  rank: string,
  label: string,
  marker: MarkerData,
  blip: Blip,
  spawnLocations: SpawnLocation[]
}

// NOTES
// - SASP vehicles are showing for BCSO (for those who arent admin above perm ting, look into this later)

export class Garages {
  // Main Data
  private client: Client;

  // Location Data
  private currentGarage: Garage;
  private locations: Garage[] = [];

  // Menu Data
  private menu: Menu;
  private policeVehicles: Submenu;
  private countyVehicles: Submenu;
  private stateVehicles: Submenu;

  private usingMenu: boolean = false;

  // Ticks
  private distTick: number = undefined;
  private interactionTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Garages | Jobs (Police) Controller", "Started!");
  }

  public get Open(): boolean {
    return this.usingMenu;
  }

  public set Open(newValue: boolean) {
    this.usingMenu = newValue;
  }

  // Methods
  public init(): void {
    const configLocations = clientConfig.controllers.police.garage.locations;
    if (this.locations.length > 0) { // If menu locations already has entries
      for (let i = 0; i < this.locations.length; i++) {
        const blip = new Blip(this.locations[i].blip.Handle);
        blip.delete();
        this.locations.splice(i, 1);
      }
    }

    for (let i = 0; i < configLocations.length; i++) {
      const position = new Vector3(configLocations[i].x, configLocations[i].y, configLocations[i].z);
      const marker: MarkerData = clientConfig.controllers.police.garage.markerData;
      const blipData: BlipData = clientConfig.controllers.police.garage.blipData;

      // Blip Creation
      let namePrefix = "Garage Rank NOT FOUND";
      if (configLocations[i].rank == Jobs.Police) namePrefix = JobLabels.Police;
      if (configLocations[i].rank == Jobs.County) namePrefix = JobLabels.County;
      if (configLocations[i].rank == Jobs.State) namePrefix = JobLabels.State;

      const blip = World.createBlip(position);
      blip.Sprite = blipData.sprite;
      blip.Color = blipData.colour;
      blip.Name = `${namePrefix} | Garage`;
      blip.Scale = 0.7;
      blip.Alpha = 0;

      this.locations.push({
        coords: position,
        rank: configLocations[i].rank,
        label: configLocations[i].label,
        marker: marker,
        blip: blip,
        spawnLocations: configLocations[i].spawnLocations
      });
    }

    console.log("creates zones!");

    this.menu = new Menu(`Garage`, GetCurrentResourceName(), MenuPositions.MiddleRight);
  }

  // private async vehiclesInArea(positionData: SpawnLocation): Promise<Vehicle[]> {
  //   const spawnPosition = new Vector3(positionData.x, positionData.y, positionData.z);
  //   const worldVehs = World.getAllVehicles();
  //   const foundVehicles: Vehicle[] = [];
  //
  //
  //   for (let i = 0; i < worldVehs.length; i++) {
  //     const vehPosition = worldVehs[i].Position;
  //
  //     if (vehPosition.distance(spawnPosition) <= clientConfig.controllers.police.garage.nearVehiclesDist) {
  //       // console.log("vehicle within dist", worldVehs[i].Handle, worldVehs[i].NetworkId, worldVehs[i].NumberPlate);
  //       foundVehicles.push(worldVehs[i]);
  //     }
  //   }
  //
  //   // console.log("found vehicles", foundVehicles);
  //
  //   return foundVehicles;
  // }

  private async findPosition(locations: SpawnLocation[]): Promise<[boolean, Vector3, number]> {
    for (let i = 0; i < locations.length; i++) {
      // const nearbyVehicles = await this.vehiclesInArea(locations[i]); // Returns all the vehicles in each parking spot
      // if (nearbyVehicles.length <= 0) { // If there are no vehicles in a parking spot
      const spotFilled = IsAnyVehicleNearPoint(locations[i].x, locations[i].y, locations[i].z, clientConfig.controllers.police.garage.nearVehiclesDist);
      if (!spotFilled) {
        return [true, new Vector3(locations[i].x, locations[i].y, locations[i].z), locations[i].h];
      }
    }

    return [false, null, -1];
  }

  private async sortVehicles(vehicles: Record<string, any>): Promise<VehData[]> {
    let vehs: VehData[] = [];
    for (const [hash, vehData] of Object.entries(vehicles)) {
      const vehicle = vehData as VehData;
      vehs.push(vehicle);
    }

    vehs = vehs.sort(function(a, b) {
      const textA = a.brand.toUpperCase();
      const textB = b.brand.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });

    return vehs;
  }

  public async setup(): Promise<void> {
    this.client.menuManager.emptyMenu(this.menu.handle); // Empty current vehicles
    const vehicles = await this.sortVehicles(serverConfig.vehicles.blacklister); // Sort the vehicles array, so it's just VehData and no hash

    for (let b = 0; b < vehicles.length; b++) {
      const vehicle = vehicles[b]; // Get second entry from array, as first entry is vehicle hash.

      if (vehicle.type == "emergency") {
        // const myJob: string = this.client.Character.job.name;
        const menuPermission = await this.hasPermission(vehicle);

        // Handles what name to give the menu
        // if (myJob == Jobs.State) {
        //   const newName = `${JobLabels.State} | Garage`;
        //   if (this.menu.Name !== newName) {
        //     this.menu.Name = newName;
        //   }
        // } else if (myJob == Jobs.Police) {
        //   const newName = `${JobLabels.Police} | Garage`;
        //   if (this.menu.Name !== newName) {
        //     this.menu.Name = newName;
        //   }
        // } else if (myJob == Jobs.County) {
        //   const newName = `${JobLabels.County} | Garage`;
        //   if (this.menu.Name !== newName) {
        //     this.menu.Name = newName;
        //   }
        // }

        // Spawn Button (With spawn logic)
        if (menuPermission) {
          const spawnButton = this.menu.BindButton(`${vehicle.brand}, ${vehicle.name}`, async () => {
            const [positionAvailable, position, heading] = await this.findPosition(this.currentGarage.spawnLocations);
            const myPed = Game.PlayerPed;
            let spawnPos = position;
            let spawnHeading = heading;

            if (!positionAvailable) {
              spawnPos = myPed.Position;
              spawnHeading = myPed.Heading;
            } else {
              const notify = new Notification("Garage", "Your vehicle is ready at one of the parking spots.", NotificationTypes.Info);
              await notify.send();
            }

            if (IsPedInAnyVehicle(myPed.Handle, false)) myPed.CurrentVehicle.delete();

            const createdVeh = await createVeh(vehicle.model, spawnPos, spawnHeading);
            TaskWarpPedIntoVehicle(myPed.Handle, createdVeh.Handle, VehicleSeat.Driver); // Set you in the drivers seat of the vehicle
            await this.menu.Close();
          });
        }
      }
    }
  }

  public start(): void {
    if (this.distTick === undefined) this.distTick = setTick(async() => {
      let currentPos: Vector3;

      for (let a = 0; a < this.locations.length; a++) {
        if (this.client.Character.isLeoJob()) { // If you have the correct job (Police, State, County, Fire/EMS)
          if (this.client.Character.job.status) { // If you are on duty
            if (!this.usingMenu) {
              let dist = Game.PlayerPed.Position.distance(this.locations[a].coords);

              if (dist <= 10) {
                currentPos = this.locations[a].coords;

                if (this.interactionTick === undefined) this.interactionTick = setTick(async () => {
                  if (!this.usingMenu) {
                    dist = Game.PlayerPed.Position.distance(this.locations[a].coords);
                    World.drawMarker(
                      this.locations[a].marker.type,
                      this.locations[a].coords,
                      new Vector3(0, 0, 0),
                      new Vector3(0, 0, 0),
                      new Vector3(1, 1, 1),
                      Color.fromRgb(this.locations[a].marker.colour.r, this.locations[a].marker.colour.g, this.locations[a].marker.colour.b),
                      false,
                      true,
                      false,
                      null,
                      null,
                      false
                    );

                    if (dist <= 1.5) {
                      if (!IsPedInAnyVehicle(Game.PlayerPed.Handle, false)) {
                        Screen.displayHelpTextThisFrame("~INPUT_CONTEXT~ to access the garage"); // Display the E toggle

                        if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Context)) { // If E is pressed
                          this.currentGarage = this.locations[a]; // Set your current garage into a variable, so it can be called later on
                          await this.menu.Open(); // Open the menu
                          this.usingMenu = true; // Set the using menu variable to true
                        }
                      } else {
                        Screen.displayHelpTextThisFrame("~INPUT_CONTEXT~ Return vehicle to the garage"); // Display the E toggle

                        if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Context)) { // If E is pressed
                          Game.PlayerPed.CurrentVehicle.delete();
                        }
                      }
                    }
                  }
                });
              }
            }
          } else {
            if (this.interactionTick !== undefined) {
              clearTick(this.interactionTick);
              this.interactionTick = undefined;
            }
          }
        }
      }

      if (currentPos !== undefined) {
        if (currentPos.distance(Game.PlayerPed.Position) > 15) {
          currentPos = undefined;

          if (this.interactionTick !== undefined) {
            clearTick(this.interactionTick);
            this.interactionTick = undefined;
          }
        }
      }

      await Delay(1000);
    });
  }

  public stop(): void {
    if (this.distTick !== undefined) {
      clearTick(this.distTick);
      this.distTick = undefined;
    }

    if (this.interactionTick !== undefined) {
      clearTick(this.interactionTick);
      this.interactionTick = undefined;
    }
  }

  private async hasPermission(vehicle: VehData): Promise<boolean> {
    if (vehicle.rank !== undefined) {
      if (typeof vehicle.rank == "object") {
        if (this.client.Character.job.name == vehicle.job) {
          for (let i = 0; i < vehicle.rank.length; i++) {
            if (this.client.Character.job.rank >= vehicle.rank[i] || this.client.Player.Rank >= Ranks.Admin) { // If you have permission or you're a admin or above
              return true;
            }
          }
        }
      } else if (typeof vehicle.rank == "number") {
        if (this.client.Character.job.name == vehicle.job) {
          if (this.client.Character.job.rank >= vehicle.rank || this.client.Player.Rank >= Ranks.Admin) { // If you have permission or you're a admin or above
            return true;
          }
        }
      }

      return false;
    } else {
      return true; // for fun debugging
    }
  }

  // Events
  public toggleBlips(toggleState: boolean): void {
    for (let i = 0; i < this.locations.length; i++) {
      if (toggleState) {
        const blip = new Blip(this.locations[i].blip.Handle);
        blip.Alpha = 255;
      } else {
        const blip = new Blip(this.locations[i].blip.Handle);
        blip.Alpha = 0;
      }
    }
  }
}
