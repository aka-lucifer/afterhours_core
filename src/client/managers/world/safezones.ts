import { Game, Vector3 } from "fivem-js";
import { Client } from "../../client";

import { BoxZone } from "../../helpers/boxZone";
import { PolyZone } from "../../helpers/PolyZone";

import { Delay } from "../../utils";
import clientConfig from "../../../configs/client.json";

export class SafezoneManager {
  private client: Client;

  private registeredZones: PolyZone[] = [];
  private enteredState: boolean;

  constructor(client: Client) {
    this.client = client;
  }

  // Getters
  public get Safezones(): PolyZone[] {
    return this.registeredZones;
  }

  public get inSafezone(): boolean {
    return this.enteredState;
  }

  // Methods
  public registerSafezones(): void {
    for (let i = 0; i < clientConfig.world.safezones.length; i++) {
      const safezone = new PolyZone(clientConfig.world.safezones[i]).create();
      this.registeredZones.push(safezone);
    }
  }

  public init(): void {
    this.registerSafezones();
  }

  public async getSafezoneByName(name: string): Promise<number> {
    const index = this.registeredZones.findIndex(zone => zone.options.name == name);
    if (index !== -1) {
      return index;
    }
  }

  public add(zone: PolyZone): number {
    return this.registeredZones.push(zone);
  }

  public async remove(index: number): Promise<void> {
    this.registeredZones.splice(index, 1);
  }

  public async removeByName(name: string): Promise<boolean> {
    const index = this.registeredZones.findIndex(zone => zone.options.name == name);
    if (index !== -1) {
      this.registeredZones.splice(index, 1);
      return true;
    }
  }

  public start(): void {
    for (let i = 0; i < this.registeredZones.length; i++) {
      this.registeredZones[i].onPlayerInOut(async(isInside: boolean, pedPos: Vector3) => {
        if (this.enteredState != isInside) {
          this.enteredState = isInside;

          SetCanAttackFriendly(Game.PlayerPed.Handle, !isInside, true);
          SetPedSuffersCriticalHits(Game.PlayerPed.Handle, !isInside);
          NetworkSetFriendlyFireOption(!isInside);
        }
      });
    }
  }
}