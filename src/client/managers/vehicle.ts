import { Client } from "../client";

import { LXEvents } from "../../shared/enums/events/lxEvents";

// Controllers
import { Speedzones } from "../controllers/vehicles/speedzones";
import { VehicleWeapon } from "../controllers/vehicles/vehWeapon";
import { AntiControl } from "../controllers/vehicles/antiControl";
import { LeaveDoorOpen } from "../controllers/vehicles/leaveDoorOpen";
import { CruiseControl } from "../controllers/vehicles/cruiseControl";
import { RepairShops } from "../controllers/vehicles/repairShops";

export class VehicleManager {
  private client: Client;

  // Controllers
  public speedZones: Speedzones;
  public weapon: VehicleWeapon;
  private antiControl: AntiControl;
  private leaveDoorOpen: LeaveDoorOpen;
  private cruiseControl: CruiseControl;
  private repairShops: RepairShops;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(LXEvents.EnteredVeh_Cl, this.EVENT_enteredVeh.bind(this));
    onNet(LXEvents.LeftVeh_Cl, this.EVENT_leftVeh.bind(this));
  }

  // Methods
  public init(): void {
    this.speedZones = new Speedzones(this.client);
    this.speedZones.init();
    this.weapon = new VehicleWeapon();
    this.antiControl = new AntiControl();
    this.leaveDoorOpen = new LeaveDoorOpen();
    this.cruiseControl = new CruiseControl();
    this.repairShops = new RepairShops();
    this.repairShops.init();
  }

  public start(): void {
    this.speedZones.start();
    this.repairShops.start();
  }

  // Events
  private EVENT_enteredVeh(): void {
    if (!this.antiControl.RollStarted) this.antiControl.startRoll();
    if (!this.antiControl.AirStarted) this.antiControl.startAir();
    if(!this.leaveDoorOpen.Started) this.leaveDoorOpen.start();
  }
  
  private EVENT_leftVeh(): void {
    if (this.antiControl.RollStarted) this.antiControl.stopRoll();
    if (this.antiControl.AirStarted) this.antiControl.stopAir();
    if(this.leaveDoorOpen.Started) this.leaveDoorOpen.stop();
  }
}