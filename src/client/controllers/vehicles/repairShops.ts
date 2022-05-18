import { Control, Game, InputMode, Screen, Vector3, VehicleDoorIndex, World } from "fivem-js";

import { client } from "../../client";
import { Inform } from "../../utils";

import { PolyZone } from "../../helpers/PolyZone";
import { BoxZone } from "../../helpers/boxZone";

import { Progress } from "../../models/ui/progress";
import { Notification } from "../../models/ui/notification";

import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Sounds } from "../../../shared/enums/sounds";

import clientConfig from "../../../configs/client.json";

interface ShopLocation {
  name: string,
  position: {x: number, y: number, z: number, l: number, w: number};
}

export class RepairShops {

  private shopLocations: ShopLocation[] = [];
  private shops: PolyZone[] = [];

  private createdShops: boolean = false;

  private showNotify: boolean = false;
  private repairing: boolean = false;
  
  // Ticks
  private tick: number = undefined;
  private cancelTick: number = undefined;

  constructor() {
    Inform("Vehicle | Repair Shops Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.createdShops;
  }

  // Methods
  public init(): void {
    const shops = clientConfig.controllers.vehicles.repairing.shopLocations;

    for (let i = 0; i < shops.length; i++) {
      const blipPos = new Vector3(shops[i].location.x, shops[i].location.y, shops[i].location.z)
      const blip = World.createBlip(blipPos);
      blip.Sprite = 446;
      blip.Scale = 0.7;
      blip.IsShortRange = true;
      blip.Name = "Repair Shop";

      this.shopLocations.push({
        name: shops[i].name,
        position: shops[i].location
      });
    }
  }

  private async interactTask(): Promise<void> {
    if (!this.repairing) {
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;

        if (currVeh.Driver.Handle == myPed.Handle) {
          Screen.displayHelpTextThisFrame("~INPUT_PICKUP~ Repair Vehicle");
          if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Pickup)) {
            if (currVeh.Health < currVeh.MaxHealth) {
              const progress = new Progress(20000, {
                vehicle: true
              }, async() => {
                if (global.exports["xsound"].isPlaying("veh_repair")) global.exports["xsound"].Destroy("veh_repair");
                SetVehicleDoorShut(currVeh.Handle, VehicleDoorIndex.Hood, false)
                currVeh.IsEngineRunning = true;
                currVeh.IsDriveable = true;
                SetVehicleEngineOn(currVeh.Handle, true, false, true);
                SetVehicleUndriveable(currVeh.Handle, false);
                this.repairing = false;
                const notify = new Notification("Mechanic", "You cancelled repairing your vehicle!", NotificationTypes.Error);
                await notify.send();
                client.richPresence.Status = undefined;
                
                if (this.cancelTick !== undefined) {
                  clearTick(this.cancelTick);
                  this.cancelTick = undefined;
                }
              }, () => {
                this.repairing = true;
                SetVehicleDoorOpen(currVeh.Handle, VehicleDoorIndex.Hood, false, false);
                currVeh.IsEngineRunning = false;
                currVeh.IsDriveable = false;
                global.exports["xsound"].PlayUrlPos("veh_repair", Sounds.Repair, 0.15, Game.PlayerPed.Position, false);
                client.richPresence.Status = "Repairing Vehicle At Shop";

                this.cancelTick = setTick(() => {
                  if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Enter) || Game.isDisabledControlJustPressed(InputMode.MouseAndKeyboard, Control.Enter)) { // Exiting vehicle
                    progress.cancel();
                    clearTick(this.cancelTick);
                    this.cancelTick = undefined;
                  };
                });
              }, async() => {
                if (global.exports["xsound"].isPlaying("veh_repair")) global.exports["xsound"].Destroy("veh_repair");
                currVeh.repair();
                global.exports["vehDeformation"].FixVehicleDeformation(currVeh.Handle); // Wait until the vehicle is repair, then fix the deformation
                SetVehicleDoorShut(currVeh.Handle, VehicleDoorIndex.Hood, false);
                currVeh.IsEngineRunning = true;
                currVeh.IsDriveable = true;
                SetVehicleEngineOn(currVeh.Handle, true, false, true);
                SetVehicleUndriveable(currVeh.Handle, false);
                currVeh.DirtLevel = 0.0;
                const notify = new Notification("Mechanic", "Your vehicle has been repaired", NotificationTypes.Info);
                await notify.send();
                this.repairing = false;
                client.richPresence.Status = undefined;
                
                if (this.cancelTick !== undefined) {
                  clearTick(this.cancelTick);
                  this.cancelTick = undefined;
                }
              })
              
              progress.start();
            } else {
              const notify = new Notification("Mechanic", "Your vehicle isn't damaged!", NotificationTypes.Error);
              await notify.send();
            }
          }
        }
      }
    }
  }

  public start(): void {
    console.log("create repair shops!");
    
    for (let i = 0; i < this.shopLocations.length; i++) {
      const zone = new BoxZone({
        box: this.shopLocations[i].position,
        options: {
          name: this.shopLocations[i].name,
          heading: 0,
          debugPoly: false
        }
      }).create();
  
      this.shops.push(zone);

      zone.onPlayerInOut(async(isInside: boolean, pedPos: Vector3) => {
        if (isInside) {
          if (this.tick === undefined) this.tick = setTick(this.interactTask);
        } else {
          if (this.tick !== undefined) {
            clearTick(this.tick);
            this.tick = undefined;
            console.log("cleared tick!");
          }
        }
      }, 1000);

      if (i == (this.shopLocations.length - 1)) { // if last entry, set created to true
        this.createdShops = true;
        console.log("created repair shops!");
      }
    }
  }

  public stop(): void {
    for (let i = 0; i < this.shops.length; i++) {
      // const shopName = this.shops[i].options.name;
      this.shops[i].destroy();
      
      if (this.tick !== undefined) {
        clearTick(this.tick);
        this.tick = undefined;
      }
      
      if (this.cancelTick !== undefined) {
        clearTick(this.tick);
        this.tick = undefined;
      }

      // console.log(`destroyed repair shop (${i} | ${shopName}) and cleared ticks!`);
      
      if (i == (this.shops.length - 1)) {
        // console.log("clear shops array as on final entry!");
        this.shops = [];
        this.createdShops = false;
      }
    }
  }
}