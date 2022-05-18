import { Game } from "fivem-js";

import { Client } from "../client";

import { LXEvents } from "../../shared/enums/events/lxEvents";

// Controllers
import { WeaponRemovers } from "../controllers/weapons/removers";
import { Disarmer } from "../controllers/weapons/disarmer";
import { Reloading } from "../controllers/weapons/reloading";
import { WeaponModes } from "../controllers/weapons/modes";
import { SpamPreventor } from "../controllers/weapons/spamPreventor";
import { WeaponRecoil } from "../controllers/weapons/recoil";
import { WeaponDisablers } from "../controllers/weapons/disablers";
import { WeaponJamming } from "../controllers/weapons/jamming";
import { Taser } from "../controllers/weapons/taser";
import { OnBack } from "../controllers/weapons/onBack";

export class WeaponManager {
  private client: Client;

  // Controllers
  public removers: WeaponRemovers;
  public disarmers: Disarmer;
  public reloading: Reloading;
  public modes: WeaponModes;
  public spamPreventor: SpamPreventor;
  public recoil: WeaponRecoil;
  public disablers: WeaponDisablers;
  public jamming: WeaponJamming;
  private taser: Taser;
  public onBack: OnBack;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public init(): void {
    console.log("weapon manager init!");
    this.removers = new WeaponRemovers(this.client); // done
    this.disarmers = new Disarmer(this.client); // done
    this.reloading = new Reloading(this.client); // done
    this.modes = new WeaponModes(this.client); // done
    this.spamPreventor = new SpamPreventor(this.client); // done
    this.recoil = new WeaponRecoil(this.client); // done
    this.disablers = new WeaponDisablers(); // done (0.05ms-0.07ms)
    this.jamming = new WeaponJamming(this.client); // done
    this.taser = new Taser(this.client); // done
    this.onBack = new OnBack(); // done
  }

  public start(): void {
    console.log("start weapon manager!");
    this.removers.start(); // done
    this.recoil.init(); // done
    this.disablers.start(); // done
    this.taser.init(); // done
    this.onBack.start(); // done
  }
}