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

export class WeaponManager {
  private client: Client;

  // Controllers
  public removers: WeaponRemovers;
  public disamers: Disarmer;
  public reloading: Reloading;
  public modes: WeaponModes;
  public spamPreventor: SpamPreventor;
  public recoil: WeaponRecoil;
  public disablers: WeaponDisablers;
  public jamming: WeaponJamming;
  private taser: Taser;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public init(): void {
    this.removers = new WeaponRemovers(this.client);
    this.disamers = new Disarmer(this.client);
    this.reloading = new Reloading(this.client);
    this.modes = new WeaponModes(this.client);
    this.spamPreventor = new SpamPreventor(this.client);
    this.recoil = new WeaponRecoil(this.client);
    this.disablers = new WeaponDisablers();
    this.jamming = new WeaponJamming();
    this.taser = new Taser();
  }

  public start(): void {
    this.removers.start();
    this.recoil.init();
    this.disablers.start();
  }
}