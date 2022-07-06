import { Game } from "fivem-js";
import { CarryStates } from "../../../shared/enums/carryStates";
import { Events } from "../../../shared/enums/events/events";

import { Client } from "../../client";
import { Inform, LoadAnim, PlayAnim } from "../../utils";

export class Carrying {
  private client: Client;

  private carrying: boolean = false;
  private beingCarried: boolean = false;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.carryPlayer, this.EVENT_carryPlayer.bind(this));
    onNet(Events.startCarrying, this.EVENT_startCarrying.bind(this));
    onNet(Events.stopCarrying, this.EVENT_stopCarrying.bind(this));

    Inform("Carrying | Civilian Controller", "Started!");
  }

  // Getters
  public get Carried(): boolean {
    return this.beingCarried;
  }

  public get Carrying(): boolean {
    return this.carrying;
  }

  // Events
  private async EVENT_carryPlayer(carriersNetId: number): Promise<void> {
    const carriersPedHandle = GetPlayerPed(GetPlayerFromServerId(carriersNetId));
    if (carriersPedHandle > 0) {
      const loadedDict = await LoadAnim("nm");
      if (loadedDict) {
        const myPed = Game.PlayerPed;
        const playingAnim = await PlayAnim(myPed, "nm", "firemans_carry", 33, -1, 8.0, -8.0, 0, false, false, false);
        if (playingAnim) {
          AttachEntityToEntity(Game.PlayerPed.Handle, carriersPedHandle, 0, 0.27, 0.15, 0.63, 0.5, 0.5, 0, false, false, true, false, 2, false);
          this.beingCarried = true;
        }
      }
    }
  }
  
  private async EVENT_startCarrying(): Promise<void> {
    const loadedDict = await LoadAnim("missfinale_c2mcs_1");
    if (loadedDict) {
      const myPed = Game.PlayerPed;
      const playingAnim = await PlayAnim(myPed, "missfinale_c2mcs_1", "fin_c2_mcs_1_camman", 49, -1, 8.0, -8.0, 0, false, false, false);
      if (playingAnim) this.carrying = true;
    }
  }

  public EVENT_stopCarrying(): void {
    if (this.client.Player.Spawned) {
      const myPed = Game.PlayerPed;
      const myStates = Player(this.client.Player.NetworkId);

      if (myStates.state.carryState === CarryStates.Carried) {
        DetachEntity(myPed.Handle, false, false);
        ClearPedTasks(myPed.Handle);
        this.beingCarried = false;
      } else if (myStates.state.carryState === CarryStates.Carrying) {
        ClearPedTasks(myPed.Handle);
        this.carrying = false;
      }
    }
  }
}