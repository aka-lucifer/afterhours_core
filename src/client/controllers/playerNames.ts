import { Game, Ped, VehicleSeat } from "fivem-js";

import { Client } from "../client";
import { Delay, Inform } from '../utils';

import { Notification } from "../models/ui/notification";

import { Ranks } from "../../shared/enums/ranks";
import { getRankFromValue } from "../../shared/utils";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";

import clientConfig from "../../configs/client.json";
import { Jobs } from "../../shared/enums/jobs/jobs";

interface GamerTag {
  tag: number,
  ped: Ped,
  carIcon: boolean,
  bikeIcon: boolean,
  passengerIcon: boolean,
  healthInfo: boolean
}

export class PlayerNames {
  // Client Data
  private client: Client;

  // Tick Data
  private displayTick: number = undefined;

  // Names Data
  private createdTags: GamerTag[] = [];

  constructor(client: Client) {
    this.client = client;
    
    // Keymappings
    RegisterCommand("+toggle_names", this.toggleNames.bind(this), false);
    
    Inform("Player Names | Disablers Controller", "Started!");
  }

  // Methods
  private async toggleNames(): Promise<void> {
    if (this.client.Player.Spawned) {
      if (this.displayTick === undefined) {
        await this.displayNames();
      } else {
        await this.hideNames();
      }
    }
  }

  private async displayNames(): Promise<void> {
    if (this.client.Player.Spawned) {
      const notify = new Notification("Player Names", "Enabled", NotificationTypes.Success);
      await notify.send();

      if (this.displayTick == undefined) this.displayTick = setTick(async() => {
        const myPed = Game.PlayerPed;
        const svPlayers = this.client.Players;

        // Loop through all players
        for(let i = 0; i < svPlayers.length; i++) {
          const netId = svPlayers[i].NetworkId; // Force it to be a number, for some reason showing as string

          // If the other connected players aren't you

          // if (this.client.player.NetworkId != netId) { (Disables so you can see your own name)
            if (svPlayers[i].spawned) {
              const playerId = GetPlayerFromServerId(netId);

              // If they're inside your scope or not (THIS IS HOW U BEAT ONESYNC INFINITY PLAYER ID NOT FOUND BS)
              if (playerId != -1) {
                const playerStates = Player(netId);
                const ped = new Ped(GetPlayerPed(playerId));

                // Name formatting
                let name;

                // If you're a mod or above, display player & character names on ped, otherwise just the character name
                if (this.client.Player.Rank >= Ranks.Moderator) {
                  name = `${svPlayers[i].Name} | ${svPlayers[i].Character.firstName} ${svPlayers[i].Character.lastName}`;
                } else {
                  name = `${svPlayers[i].Character.firstName} ${svPlayers[i].Character.lastName}`;
                }

                // Job department and rank in name (if their job is LEO, Fire, or EMS & they're on duty)
                if (svPlayers[i].Character.job.name == Jobs.State || svPlayers[i].Character.job.name == Jobs.County || svPlayers[i].Character.job.name == Jobs.Police) { // If LEO
                  if (svPlayers[i].Character.job.status) { // If on duty
                    name = `${name} | ${svPlayers[i].Character.job.label} (${await getRankFromValue(svPlayers[i].Character.job.rank, svPlayers[i].Character.job.name)})`;
                  }
                } else if (svPlayers[i].Character.job.name === Jobs.Community && svPlayers[i].Character.job.status) { // If on duty Community Officer
                  name = `${name} | ${svPlayers[i].Character.job.label}`;
                }

                // Whether or not to display staffs ranks in their name
                name = svPlayers[i].Rank >= Ranks.Moderator && playerStates.state.rankVisible || svPlayers[i].Rank >= Ranks.Basic && svPlayers[i].Rank <= Ranks.Platinum ? `${name} | ${Ranks[svPlayers[i].Rank]}`: name;

                // Displaying AFK or paused in player name
                if (playerStates.state.afk && !playerStates.state.paused) {
                  name = `${name} | AFK`;
                } else if (playerStates.state.paused && !playerStates.state.afk) {
                  name = `${name} | PAUSED`;
                } else if (playerStates.state.paused && playerStates.state.afk) {
                  name = `${name} | PAUSED | AFK`;
                } else {
                  name = name + "";
                }

                if (this.createdTags[netId] === undefined) {
                  this.createdTags[netId] = {
                    // tag: CreateMpGamerTagWithCrewColor(playerId, `${netId} | ${name}`, true, true, "Gold", 2, 0, 255, 0),
                    tag: CreateMpGamerTag(ped.Handle, `${netId} | ${name}`, false, false, null, -1),
                    ped: ped,
                    carIcon: false,
                    bikeIcon: false,
                    passengerIcon: false,
                    healthInfo: false
                  }
                } else {
                  this.createdTags[netId] = {
                    // tag: CreateMpGamerTagWithCrewColor(playerId, `${netId} | ${name}`, true, true, "Gold", 2, 0, 255, 0),
                    tag: CreateMpGamerTag(ped.Handle, `${netId} | ${name}`, false, false, null, -1),
                    ped: ped,
                    carIcon: this.createdTags[netId].carIcon,
                    bikeIcon: this.createdTags[netId].bikeIcon,
                    passengerIcon: this.createdTags[netId].passengerIcon,
                    healthInfo: this.createdTags[netId].healthInfo
                  }
                }

                // Store the tag
                const tag = this.createdTags[netId].tag;

                if (this.createdTags[netId].ped.Position.distance(myPed.Position) <= clientConfig.controllers.staff.playerNames.distance && HasEntityClearLosToEntity(this.createdTags[netId].ped.Handle, myPed.Handle, 17)) {

                  // Sets gamertag name colour
                  switch(svPlayers[i].Rank) {
                    case Ranks.Management:
                      SetMpGamerTagColour(tag, tagIcons.Name, 142);
                      break;
                    case Ranks.SeniorAdmin:
                      SetMpGamerTagColour(tag, tagIcons.Name, 27);
                      break;
                    case Ranks.Admin:
                      SetMpGamerTagColour(tag, tagIcons.Name, 25);
                      break;
                    case Ranks.Moderator:
                      SetMpGamerTagColour(tag, tagIcons.Name, 9);
                      break;
                    case Ranks.Platinum:
                      SetMpGamerTagColour(tag, tagIcons.Name, 110);
                      break;
                    case Ranks.Diamond:
                      SetMpGamerTagColour(tag, tagIcons.Name, 111);
                      break;
                    case Ranks.Gold:
                      SetMpGamerTagColour(tag, tagIcons.Name, 109);
                      break;
                    case Ranks.Silver:
                      SetMpGamerTagColour(tag, tagIcons.Name, 108);
                      break;
                    case Ranks.Basic:
                      SetMpGamerTagColour(tag, tagIcons.Name, 113);
                      break;
                    default: // Set default colour (white)
                      SetMpGamerTagColour(tag, tagIcons.Name, 1);
                      break;
                  }

                  // Gamertag Icons

                  // Name
                  SetMpGamerTagVisibility(tag, tagIcons.Name, true);
                  SetMpGamerTagAlpha(tag, tagIcons.Name, 255);

                  if (IsPlayerFreeAimingAtEntity(Game.Player.Handle, ped.Handle)) {
                    if (!this.createdTags[netId].healthInfo) {
                      this.createdTags[netId].healthInfo = true;
                      SetMpGamerTagVisibility(tag, tagIcons.Health, true); // Health
                      SetMpGamerTagAlpha(tag, tagIcons.Health, 255);
                      SetMpGamerTagHealthBarColour(tag, 25); // Health Colour
                    }
                  } else {
                    if (this.createdTags[netId].healthInfo) {
                      this.createdTags[netId].healthInfo = false;
                      SetMpGamerTagVisibility(tag, tagIcons.Health, false); // Health
                      SetMpGamerTagAlpha(tag, tagIcons.Health, 0);
                    }
                  }

                  // SetMpGamerTagVisibility(tag, tagIcons.CrewTag, true); // Crew Tag
                  // SetMpGamerTagVisibility(tag, tagIcons.Passive, true); // Paused
                  // SetMpGamerTagVisibility(tag, tagIcons.PedFollowing, true); // Person (Passenger)

                  SetMpGamerTagVisibility(tag, tagIcons.Talking, NetworkIsPlayerTalking(playerId)); // Talking
                  SetMpGamerTagAlpha(tag, tagIcons.Talking, 255);
                  // SetMpGamerTagVisibility(tag, tagIcons.UsingMenu, true); // Flag

                  SetMpGamerTagVisibility(tag, tagIcons.Typing, playerStates.state.chatOpen); // Typing
                  SetMpGamerTagAlpha(tag, tagIcons.Typing, 255);


                  if (IsPedInAnyVehicle(ped.Handle, false)) {
                    const currVeh = ped.CurrentVehicle;

                    if (currVeh.getPedOnSeat(VehicleSeat.Driver).Handle == ped.Handle) {
                      if (currVeh.Model.IsBike || currVeh.Model.IsQuadbike) {
                        if (!this.createdTags[netId].bikeIcon) { // If the bike icon is hidden, show it
                          this.createdTags[netId].bikeIcon = true;
                          SetMpGamerTagVisibility(tag, tagIcons.BikerArrow, true); // Driver (Bike)
                          SetMpGamerTagAlpha(tag, tagIcons.BikerArrow, 255);
                        }
                      } else {
                        if (!this.createdTags[netId].carIcon) { // If the car wheel icon is hidden, show it
                          this.createdTags[netId].carIcon = true;
                          SetMpGamerTagVisibility(tag, tagIcons.Driver, true); // Driver (Wheel)
                          SetMpGamerTagAlpha(tag, tagIcons.Driver, 255);
                        }
                      }

                      // Disable passenger icons
                      if (this.createdTags[netId].passengerIcon) { // If the passenger icon is showing, hide it
                        this.createdTags[netId].passengerIcon = false;
                        SetMpGamerTagVisibility(tag, tagIcons.PedFollowing, false); // Person (Passenger)
                        SetMpGamerTagAlpha(tag, tagIcons.PedFollowing, 0);
                      }
                    } else {
                      // Disable driver icons
                      if (this.createdTags[netId].bikeIcon) { // If the bike icon is showing, hide it
                        this.createdTags[netId].bikeIcon = false;
                        SetMpGamerTagVisibility(tag, tagIcons.BikerArrow, false); // Driver (Bike)
                        SetMpGamerTagAlpha(tag, tagIcons.BikerArrow, 0);
                      }

                      if (this.createdTags[netId].carIcon) { // If the car wheel icon is showing, hide it
                        this.createdTags[netId].carIcon = false;
                        SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Bike)
                        SetMpGamerTagAlpha(tag, tagIcons.Driver, 0);
                      }

                      // Enable passenger icons
                      if (!this.createdTags[netId].passengerIcon) { // If the passenger icon is hidden, show it
                        this.createdTags[netId].passengerIcon = true;
                        SetMpGamerTagVisibility(tag, tagIcons.PedFollowing, true); // Person (Passenger)
                        SetMpGamerTagAlpha(tag, tagIcons.PedFollowing, 255);
                      }
                    }
                  } else { // Disable driver related icons if you aren't inside a vehicle, exit a vehicle
                    if (this.createdTags[netId].carIcon) { // If the car wheel icon is showing, hide it
                      this.createdTags[netId].carIcon = false;
                      SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Bike)
                      SetMpGamerTagAlpha(tag, tagIcons.Driver, 0);
                    }

                    if (this.createdTags[netId].bikeIcon) { // If the bike icon is showing, hide it
                      this.createdTags[netId].bikeIcon = false;
                      SetMpGamerTagVisibility(tag, tagIcons.BikerArrow, false); // Driver (Bike)
                      SetMpGamerTagAlpha(tag, tagIcons.BikerArrow, 0);
                    }

                    if (this.createdTags[netId].passengerIcon) { // If the passenger icon is hidden, show it
                      this.createdTags[netId].passengerIcon = false;
                      SetMpGamerTagVisibility(tag, tagIcons.PedFollowing, false); // Person (Passenger)
                      SetMpGamerTagAlpha(tag, tagIcons.PedFollowing, 0);
                    }

                  }
                } else {
                  SetMpGamerTagVisibility(tag, tagIcons.Name, false); // Name
                  SetMpGamerTagVisibility(tag, tagIcons.Health, false); // Health
                  SetMpGamerTagVisibility(tag, tagIcons.Talking, false); // Talking
                  SetMpGamerTagVisibility(tag, tagIcons.Typing, false); // Typing

                  if (this.createdTags[netId].carIcon) {
                    this.createdTags[netId].carIcon = false
                    SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Bike)
                    SetMpGamerTagAlpha(tag, tagIcons.Driver, 0);
                  }

                  if (this.createdTags[netId].bikeIcon) {
                    this.createdTags[netId].bikeIcon = false
                    SetMpGamerTagVisibility(tag, tagIcons.BikerArrow, false); // Driver (Bike)
                    SetMpGamerTagAlpha(tag, tagIcons.BikerArrow, 0);
                  }

                  if (this.createdTags[netId].passengerIcon) {
                    this.createdTags[netId].passengerIcon = false
                    SetMpGamerTagVisibility(tag, tagIcons.PedFollowing, false); // Person (Passenger)
                    SetMpGamerTagAlpha(tag, tagIcons.PedFollowing, 0);
                  }
                }
              }
            }
          // }
        }

        await Delay(500);
      });
    }
  }

  private async hideNames(): Promise<void> {
    if (this.client.Player.Spawned) {
      const notify = new Notification("Player Names", "Disabled", NotificationTypes.Error);
      await notify.send();

      for (const [_, value] of Object.entries(this.createdTags)) {
        RemoveMpGamerTag(value["tag"]);
      }
      
      if (this.displayTick !== undefined) {
        clearTick(this.displayTick);
        this.displayTick = undefined;
      }
    }
  }
}

enum tagIcons {
  Name,
  CrewTag,
  Health,
  BigText,
  Talking,
  UsingMenu,
  Passive,
  Wanted,
  Driver,
  Passenger,
  Tagged,
  NameNearby,
  Arrow,
  Packages,
  PedFollowing,
  RankText,
  Typing,
  BagLarge,
  GangCEO,
  GankBiker,
  BikerArrow,
  MCPresident,
  MCVicePresident,
  MCRoadCaptain,
  MCSergeant,
  MCEnforcer,
  Transmitter,
  Bomb
}
