import { VehicleSeat, World } from "fivem-js";

import {Client} from "../client";

import {GravityGun} from "../controllers/staff/gravityGun";
import { StaffMenu } from "../controllers/staff/menu";
import { NoClip } from "../controllers/staff/noclip";
import { GhostPlayers } from "../controllers/staff/ghostPlayers";

import {Ranks} from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { Message } from "../../shared/models/ui/chat/message";
import { SystemTypes } from "../../shared/enums/ui/chat/types";

export class StaffManager {
  private readonly client: Client;

  // Controllers
  private gravityGun: GravityGun;
  public staffMenu: StaffMenu;
  public noclip: NoClip;
  private ghostPlayers: GhostPlayers;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.showRank, this.EVENT_showRank.bind(this));
    onNet(Events.clearWorldVehs, this.EVENT_clearVehs.bind(this))
  }

  // Methods
  public init(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      this.gravityGun = new GravityGun(this.client);
      this.staffMenu = new StaffMenu(this.client);
      this.noclip = new NoClip(this.client);
      this.ghostPlayers = new GhostPlayers();

      this.staffMenu.init();
    }
  }

  // Events
  public EVENT_showRank(): void {
    this.client.playerStates.state.set("rankVisible", !this.client.playerStates.state.rankVisible, true);
    if (this.client.playerStates.state.rankVisible) {
      emit(Events.sendSystemMessage, new Message("Your rank is now visible in your name.", SystemTypes.Interaction));
    } else {
      emit(Events.sendSystemMessage, new Message("Your rank is no longer visible in your name.", SystemTypes.Action));
    }
  }

  private EVENT_clearVehs(): void {
    const worldVehs = World.getAllVehicles();
    
    for (let i = 0; i < worldVehs.length; i++) {
      if (!worldVehs[i].getPedOnSeat(VehicleSeat.Driver).IsPlayer) {
        worldVehs[i].PreviouslyOwnedByPlayer = false;
        SetEntityAsMissionEntity(worldVehs[i].Handle, false, false);
        worldVehs[i].delete();
        if (worldVehs[i].exists()) {
          worldVehs[i].delete();
        }
      }
    }
  }
}
