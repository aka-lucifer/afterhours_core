import { Client } from "../../client";

import { Menu } from "../../models/ui/menu/menu";
import { Submenu } from "../../models/ui/menu/submenu";

import { Inform, Capitalize, Delay } from "../../utils";

import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { Events } from "../../../shared/enums/events/events";

import sharedConfig from "../../../configs/shared.json";
import { Scaleform } from "fivem-js";
import { Ranks } from "../../../shared/enums/ranks";

export interface AOPLayout {
  name: string,
  automaticCycling: boolean,
  playerMax?: number,
  positions: {x: number, y: number, z: number, heading: number}[]
}

enum AOPStates {
  None,
  Updated,
  Automatic
}

export class AOPManager {
  private client: Client;

  // Menu Data
  private aopMenu: Menu;
  private aopChangerMenu: Submenu;

  // AOP Data
  private aopCycling: boolean;
  private currentAOP: AOPLayout;

  // AOP Scaleform
  private aopScaleform: Scaleform;
  private scaleformTick: number = undefined;
  
  constructor(client: Client) {
    this.client = client;
    
    // Set AOP cycling convar into boolean variable
    this.aopCycling = (GetConvar('player_based_aop', 'false') === "true");

    // Events
    onNet(Events.syncAOP, this.EVENT_syncAOP.bind(this));
    onNet(Events.syncAOPCycling, this.EVENT_syncAOPCycling.bind(this));
    onNet(Events.aopMenu, this.EVENT_aopMenu.bind(this));
  }

  // Getters
  public get AOP(): AOPLayout {
    return this.currentAOP;
  }

  // Methods
  public init(): void {
    this.aopMenu = new Menu("AOP Selector", GetCurrentResourceName(), MenuPositions.MiddleRight);
    this.aopChangerMenu = new Submenu("Change AOP", this.aopMenu.resource, this.aopMenu.handle, this.aopMenu.position);

    for (let i = 0; i < sharedConfig.aop.locations.length; i++) {
      this.aopChangerMenu.BindButton(sharedConfig.aop.locations[i].name, () => {
        // console.log("update aop to", JSON.stringify(sharedConfig.aop.locations[i]))
        emitNet(Events.setAOP, sharedConfig.aop.locations[i]);
      })
    }

    this.aopMenu.BindCheckbox(`Player Based AOP`, this.aopCycling, (newState: boolean) => {
      if (newState != this.aopCycling) {
        emitNet(Events.setCycling, newState);
      }
    });
  }

  // Events
  public async EVENT_syncAOP(newAOP: AOPLayout, aopState: AOPStates = AOPStates.Automatic): Promise<void> {
    this.currentAOP = newAOP;

    Inform("AOP Updated", `New AOP: ${this.currentAOP.name}`);

    if (aopState == AOPStates.Automatic) {
      this.aopScaleform = new Scaleform("mp_big_message_freemode");
      const loadedScaleform = await this.aopScaleform.load();
      if (loadedScaleform) {
        this.aopScaleform.callFunction("SHOW_SHARD_WASTED_MP_MESSAGE", "AOP Change", `The Area of Patrol has changed to ~y~${this.currentAOP.name}~w~!`, 5);

        if (this.scaleformTick == undefined) this.scaleformTick = setTick(async() => {
          await this.aopScaleform.render2D();
        })

        await Delay(5000);

        if (this.scaleformTick != undefined) {
          clearTick(this.scaleformTick);
          this.scaleformTick = undefined;
        }
      }
    } else if (aopState == AOPStates.Updated) {
      this.aopScaleform = new Scaleform("mp_big_message_freemode");
      const loadedScaleform = await this.aopScaleform.load();

      if (loadedScaleform) {
        this.aopScaleform.callFunction("SHOW_SHARD_WASTED_MP_MESSAGE", "Automatic AOP", `Player based AOP has been re-enabled, the new AOP is ~y~${this.currentAOP.name}~w~!`, 5);

        if (this.scaleformTick == undefined) this.scaleformTick = setTick(async() => {
          await this.aopScaleform.render2D();
        })

        await Delay(5000);

        if (this.scaleformTick != undefined) {
          clearTick(this.scaleformTick);
          this.scaleformTick = undefined;
        }
      }
    }
  }

  public EVENT_syncAOPCycling(aopCycling: boolean): void {
    this.aopCycling = aopCycling;

    Inform("AOP Updated", ` AOP Cycling Set To (${Capitalize(this.aopCycling.toString())})`);
  }

  public async EVENT_aopMenu(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      await this.aopMenu.Open();
    }
  }
}