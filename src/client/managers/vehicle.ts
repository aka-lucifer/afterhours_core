import { Game } from "fivem-js";

import { Client } from "../client";

import { LXEvents } from "../../shared/enums/events/lxEvents";

// Controllers
import { Speedzones } from "../controllers/vehicles/speedzones";
import { VehicleWeapon } from "../controllers/vehicles/vehWeapon";
import { AntiControl } from "../controllers/vehicles/antiControl";
import { LeaveDoorOpen } from "../controllers/vehicles/leaveDoorOpen";
import { CruiseControl } from "../controllers/vehicles/cruiseControl";
import { RepairShops } from "../controllers/vehicles/repairShops";
import { GPS } from "../controllers/vehicles/gps";
import { KeepWheel } from "../controllers/vehicles/keepWheel";
import { Rolling } from "../controllers/vehicles/rolling";

export class VehicleManager {
  private client: Client;

  // Controllers
  public speedZones: Speedzones;
  public weapon: VehicleWeapon;
  private antiControl: AntiControl;
  private leaveDoorOpen: LeaveDoorOpen;
  private cruiseControl: CruiseControl;
  private repairShops: RepairShops;
  private gps: GPS;
  private keepWheel: KeepWheel;
  private rolling: Rolling;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(LXEvents.EnteredVeh_Cl, this.EVENT_enteredVeh.bind(this));
    onNet(LXEvents.LeftVeh_Cl, this.EVENT_leftVeh.bind(this));
  }

  // Methods
  public init(): void {
    this.speedZones = new Speedzones(this.client);
    this.weapon = new VehicleWeapon();
    this.antiControl = new AntiControl();
    this.leaveDoorOpen = new LeaveDoorOpen();
    this.cruiseControl = new CruiseControl();
    this.repairShops = new RepairShops();
    this.gps = new GPS();
    this.keepWheel = new KeepWheel();
    this.rolling = new Rolling();

    this.speedZones.init();
    this.repairShops.init();
    this.gps.init();
    this.rolling.init();
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
    if (!this.keepWheel.Started) this.keepWheel.start();
  }
  
  private EVENT_leftVeh(): void {
    if (this.antiControl.RollStarted) this.antiControl.stopRoll();
    if (this.antiControl.AirStarted) this.antiControl.stopAir();
    if(this.leaveDoorOpen.Started) this.leaveDoorOpen.stop();
  }
}