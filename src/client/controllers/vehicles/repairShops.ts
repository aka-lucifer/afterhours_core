import {Color, Control, Game, InputMode, MarkerType, Screen, Vector3, VehicleDoorIndex, World} from "fivem-js";

import {client} from "../../client";
import {Inform} from "../../utils";

import {Progress} from "../../models/ui/progress";
import {Notification} from "../../models/ui/notification";

import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";

import clientConfig from "../../../configs/client.json";

interface ShopLocation {
  name: string,
  position: {x: number, y: number, z: number};
}

export class RepairShops {
  private shopLocations: ShopLocation[] = [];

  private createdShops: boolean = false;

  private showNotify: boolean = false;
  private repairing: boolean = false;

  private currentPos: Vector3 = undefined;
  
  // Ticks
  private distTick: number = undefined;
  private interactTick: number = undefined;
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
      blip.Color = 5;
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
          if (currVeh.Health < currVeh.MaxHealth || currVeh.BodyHealth < currVeh.MaxHealth || currVeh.EngineHealth | currVeh.MaxHealth || currVeh.PetrolTankHealth < currVeh.MaxHealth) {
            const progress = new Progress(20000, {
              vehicle: true
            }, async() => {
              // if (global.exports["xsound"].isPlaying("veh_repair")) global.exports["xsound"].Destroy("veh_repair");
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
              // global.exports["xsound"].PlayUrlPos("veh_repair", Sounds.Repair, 0.15, Game.PlayerPed.Position, false);
              client.richPresence.Status = "Repairing Vehicle At Shop";

              this.cancelTick = setTick(() => {
                if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Enter) || Game.isDisabledControlJustPressed(InputMode.MouseAndKeyboard, Control.Enter)) { // Exiting vehicle
                  progress.cancel();
                  clearTick(this.cancelTick);
                  this.cancelTick = undefined;
                };
              });
            }, async() => {
              // if (global.exports["xsound"].isPlaying("veh_repair")) global.exports["xsound"].Destroy("veh_repair");
              currVeh.repair();
              global.exports["ah_deform"].FixVehicleDeformation(currVeh.Handle); // Wait until the vehicle is repair, then fix the deformation
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

  public start(): void {
    if (this.distTick === undefined) this.distTick = setTick(async() => {
      for (let a = 0; a < this.shopLocations.length; a++) {
        if (!this.repairing) {
          let myPed = Game.PlayerPed;
          let dist = myPed.Position.distance(this.shopLocations[a].position);

          if (dist <= 20) {
            if (this.currentPos === undefined) this.currentPos = new Vector3(this.shopLocations[a].position.x, this.shopLocations[a].position.y, this.shopLocations[a].position.z);

            if (this.interactTick === undefined) this.interactTick = setTick(async () => {
              if (!this.repairing) {
                myPed = Game.PlayerPed;
                if (IsPedInAnyVehicle(myPed.Handle, false)) {
                  const currVeh = myPed.CurrentVehicle;
                  if (currVeh.Driver.Handle == myPed.Handle) {
                    dist = myPed.Position.distance(this.shopLocations[a].position);
                    if (dist < 20) {
                      World.drawMarker(
                        MarkerType.CarSymbol,
                        new Vector3(this.shopLocations[a].position.x, this.shopLocations[a].position.y, this.shopLocations[a].position.z),
                        new Vector3(0, 0, 0),
                        new Vector3(0, 0, 0),
                        new Vector3(2.5, 2.5, 2.5),
                        Color.fromArgb(150, 255, 255, 255),
                        true,
                        true,
                        false,
                        null,
                        null,
                        false
                      );

                      if (dist <= 3) {
                        if (IsPedInAnyVehicle(Game.PlayerPed.Handle, false)) {
                          if (!this.showNotify) {
                            this.showNotify = true;
                            Screen.displayHelpTextThisFrame("~INPUT_DETONATE~ Repair Vehicle");
                          } // Display the E toggle

                          if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Detonate)) { // If E is pressed
                            console.log("repair car!");
                            await this.interactTask();
                          }
                        }
                      }
                    }
                  }
                }
              }
            });
          }
        }
      }

      if (this.currentPos !== undefined) {
        if (this.currentPos.distance(Game.PlayerPed.Position) > 15) {
          this.currentPos = undefined;

          if (this.interactTick !== undefined) {
            clearTick(this.interactTick);
            this.interactTick = undefined;

            if (this.showNotify) { // If the notify has been displayed, reset it so it can be shown again later on
              this.showNotify = false;
            }
          }
        }
      }
    });
  }

  public stop(): void {
    for (let i = 0; i < this.shopLocations.length; i++) {
      const shopName = this.shopLocations[i].name;
      
      if (this.distTick !== undefined) {
        clearTick(this.distTick);
        this.distTick = undefined;
      }

      if (this.interactTick !== undefined) {
        clearTick(this.interactTick);
        this.interactTick = undefined;
      }
      
      if (this.cancelTick !== undefined) {
        clearTick(this.cancelTick);
        this.cancelTick = undefined;
      }

      console.log(`destroyed repair shop (${i} | ${shopName}) and cleared ticks!`);
      
      if (i == (this.shopLocations.length - 1)) {
        console.log("clear shops array as on final entry!");
        this.shopLocations = [];
        this.createdShops = false;
      }
    }
  }
}
