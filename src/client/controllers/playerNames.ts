import { Vector3, Game, Ped, VehicleSeat } from "fivem-js";
import { Ranks } from "../../shared/enums/ranks";

import { Client } from "../client";
import { Delay, insideVeh } from "../utils";

export class PlayerNames {
  // Client Data
  private client: Client;

  // Tick Data
  private distTick: number = undefined;
  private displayTick: number = undefined;

  // Names Data
  private createdTags: Record<string, any> = {};

  constructor(client: Client) {
    this.client = client;
    
    RegisterCommand("+toggle_names", this.displayNames.bind(this), false);
    RegisterCommand("-toggle_names", this.hideNames.bind(this), false);
  }

  // Methods
  private displayNames(): void {
    if (this.client.Player.Spawned) {
      if (this.displayTick == undefined) this.distTick = setTick(async() => {
        const myPed = Game.PlayerPed;
        const svPlayers = this.client.Players;

        // Loop through all players
        for(let i = 0; i < svPlayers.length; i++) {
          const netId = svPlayers[i].NetworkId;
          const playerStates = Player(netId);
          const playerId = GetPlayerFromServerId(netId);
          const ped = new Ped(GetPlayerPed(playerId));

          // If the other connected players aren't you
          if (this.client.player.NetworkId != netId) {

            // Name formatting
            let name = svPlayers[i].Rank >= Ranks.Admin && playerStates.state.rankVisible ? `${svPlayers[i].Name} | ${Ranks[svPlayers[i].Rank]}`: svPlayers[i].Name;

            if (playerStates.state.afk && !playerStates.state.paused) {
              name = `${name} | AFK`;
            } else if (playerStates.state.paused && !playerStates.state.afk) {
              name = `${name} | PAUSED`;
            } else if (playerStates.state.paused && playerStates.state.afk) {
              name = `${name} | PAUSED | AFK`;
            }

            if (this.createdTags[netId] === undefined) {
              this.createdTags[netId] = {
                tag: CreateMpGamerTag(ped.Handle, `${netId} | ${name}`, false, false, null, -1),
                ped: ped
              }
            } else {
              this.createdTags[netId] = {
                tag: CreateMpGamerTag(ped.Handle, `${netId} | ${name}`, false, false, null, -1),
                ped: ped
              }
            }

            // Store the tag
            const tag = this.createdTags[netId].tag;

            if (this.createdTags[netId].ped.Position.distance(ped.Position) <= 15 && HasEntityClearLosToEntity(this.createdTags[netId].ped.Handle, ped.Handle, 17)) {

              // Sets gamertag name colour
              SetMpGamerTagColour(tag, tagIcons.Name, 142);

              // Gamertag Icons

              // Name
              SetMpGamerTagVisibility(tag, tagIcons.Name, true); 
              SetMpGamerTagAlpha(tag, tagIcons.Name, 255);

              SetMpGamerTagVisibility(tag, tagIcons.Health, true); // Health
              SetMpGamerTagAlpha(tag, tagIcons.Health, 255);
              SetMpGamerTagHealthBarColour(tag, 25); -// Health Colour

              SetMpGamerTagVisibility(tag, tagIcons.Talking, NetworkIsPlayerTalking(playerId)); // Talking
              SetMpGamerTagAlpha(tag, tagIcons.Talking, 255);
              // SetMpGamerTagVisibility(tag, tagIcons.UsingMenu, true); // Flag
              
              const [currVeh, inside] = await insideVeh(Game.PlayerPed);

              if (inside) {
                if (currVeh.getPedOnSeat(VehicleSeat.Driver).Handle == ped.Handle) {
                  SetMpGamerTagVisibility(tag, tagIcons.Driver, true); // Driver (Wheel)
                  SetMpGamerTagAlpha(tag, tagIcons.Driver, 255);
                } else {
                  SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Wheel)
                  SetMpGamerTagAlpha(tag, tagIcons.Driver, 0);
                }

                if (currVeh.getPedOnSeat(VehicleSeat.Passenger).Handle == ped.Handle) {
                  SetMpGamerTagVisibility(tag, tagIcons.Passenger, true); // Passenger (Headset)
                  SetMpGamerTagAlpha(tag, tagIcons.Passenger, 255);
                } else {
                  SetMpGamerTagVisibility(tag, tagIcons.Passenger, false); // Passenger (Headset)
                  SetMpGamerTagAlpha(tag, tagIcons.Passenger, 0);
                }
              } else {
                SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Wheel)
                SetMpGamerTagAlpha(tag, tagIcons.Driver, 0);

                SetMpGamerTagVisibility(tag, tagIcons.Passenger, false); // Passenger (Headset)
                SetMpGamerTagAlpha(tag, tagIcons.Passenger, 0);
              }

              SetMpGamerTagVisibility(tag, tagIcons.Typing, playerStates.state.chatOpen); // Typing

              // console.log(`Gamertag [${netId}]: Talking: (${NetworkIsPlayerTalking(playerId)} | ${playerId})`);
            } else {
              SetMpGamerTagVisibility(tag, tagIcons.Name, false); // Name
              SetMpGamerTagVisibility(tag, tagIcons.Health, false); // Health
              SetMpGamerTagVisibility(tag, tagIcons.Talking, false); // Talking
              SetMpGamerTagVisibility(tag, tagIcons.Driver, false); // Driver (Wheel)
              SetMpGamerTagVisibility(tag, tagIcons.Passenger, false); // Driver (Wheel)
            }
          }
        }
      });
    }
  }

  private hideNames(): void {
    if (this.client.Player.Spawned) {
      for (const [key, value] of Object.entries(this.createdTags)) {
        RemoveMpGamerTag(value["tag"]);
      }

      if (this.distTick !== undefined) {
        clearTick(this.distTick);
        this.distTick = undefined;
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
  Typing
}