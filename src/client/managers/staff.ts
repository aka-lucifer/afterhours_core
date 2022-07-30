import { Audio, Scaleform, VehicleSeat, World } from "fivem-js";

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

  // Announcement Data
  private announcementScaleform: Scaleform;
  private announcementTimeout: NodeJS.Timeout = undefined;
  private announcementTick: number = undefined;

  // Controllers
  private gravityGun: GravityGun;
  public staffMenu: StaffMenu;
  public noclip: NoClip;
  private ghostPlayers: GhostPlayers;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.rankUpdated, this.EVENT_rankUpdated.bind(this));
    onNet(Events.showRank, this.EVENT_showRank.bind(this));
    onNet(Events.clearWorldVehs, this.EVENT_clearVehs.bind(this));
    onNet(Events.showAnnouncement, this.EVENT_showAnnouncement.bind(this));
  }

  // Methods
  public init(): void {
    this.staffMenu = new StaffMenu(this.client); // Have to do outside of rank check, as has normal player checks and callbacks

    if (this.client.player.Rank >= Ranks.Moderator) {
      this.gravityGun = new GravityGun(this.client);
      this.noclip = new NoClip(this.client);
      this.ghostPlayers = new GhostPlayers();
      this.staffMenu.init(); // do perm checks and make menus
    }


  }

  // Events
  private EVENT_rankUpdated(newRank: Ranks): void {
    this.client.player.Rank = newRank;
    console.log("rank updated to", newRank, Ranks[newRank]);

    if (this.client.player.Rank >= Ranks.Moderator) {
      this.staffMenu = new StaffMenu(this.client); // Have to do outside of rank check, as has normal player checks and callbacks
      this.gravityGun = new GravityGun(this.client);
      this.noclip = new NoClip(this.client);
      this.ghostPlayers = new GhostPlayers();

      this.staffMenu.init(); // do perm checks and make menus
    }
  }

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

  private async EVENT_showAnnouncement(announcementMessage: string): Promise<void> {
    console.log("start announcement scaleform", announcementMessage);
    this.announcementScaleform = new Scaleform("MIDSIZED_MESSAGE");
      const loadedScaleform = await this.announcementScaleform.load();
      if (loadedScaleform) {
        this.announcementScaleform.callFunction("SHOW_COND_SHARD_MESSAGE", "~r~Server Announcement", announcementMessage, 2);
        Audio.playSoundFrontEnd("CHECKPOINT_PERFECT", "HUD_MINI_GAME_SOUNDSET");

        if (this.announcementTick == undefined) this.announcementTick = setTick(async() => {
          await this.announcementScaleform.render2D();
        })

        if (this.announcementTimeout === undefined) {
          this.announcementTimeout = setTimeout(() => {
            if (this.announcementTick != undefined) {
              clearTick(this.announcementTick);
              this.announcementTick = undefined;
            }
          }, 5000);
        } else {
          clearTimeout(this.announcementTimeout);
          this.announcementTimeout = setTimeout(() => {
            if (this.announcementTick != undefined) {
              clearTick(this.announcementTick);
              this.announcementTick = undefined;
            }
          }, 5000);
        }
      }
  }
}
