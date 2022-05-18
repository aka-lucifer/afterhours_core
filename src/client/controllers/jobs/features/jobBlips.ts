import { Client } from "../../../client";
import { Delay } from "../../../utils";

import { Jobs } from "../../../../shared/enums/jobs/jobs";
import { Blip, Game, Ped } from "fivem-js";

class JobBlip {
  private netId: number;
  private blip: Blip;
}

export class JobBlips {
  private client: Client;

  private createdBlips: Blip[] = [];
  private blipTick: number = undefined;

  constructor(client: Client) {
    this.client = client;
  }

  public start(): void {
    console.log("starting job blips!");
    if (this.blipTick === undefined) this.blipTick = setTick(async() => {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == "cofficer") {
        if (this.client.Character.Job.status) {
          const myPed = Game.PlayerPed;
          const svPlayers = this.client.Players;
          // Loop through all players
          for(let i = 0; i < svPlayers.length; i++) {
            const netId = svPlayers[i].NetworkId;
  
            // If the other connected players aren't you
            
            // if (this.client.player.NetworkId != netId) {
              if (svPlayers[i].spawned) {
                const playerStates = Player(netId);
                const playerId = GetPlayerFromServerId(netId);
                
                // If they're inside your scope or not (THIS IS HOW U BEAT ONESYNC INFINITY PLAYER ID NOT FOUND BS)
                if (playerId != -1) {
                  const ped = new Ped(GetPlayerPed(playerId));

                  if (!ped.AttachedBlip) {
                    console.log("blip doesn't exist on", netId);
                    const blip = ped.attachBlip();
                    blip.Scale = 0.7;
                    blip.IsShortRange = true;
                    blip.Display = 4;

                    if (svPlayers[i].Character.job.name == Jobs.State || svPlayers[i].Character.job.name == Jobs.County || svPlayers[i].Character.job.name == Jobs.Police) {
                      blip.Color = 1;
                      const firstName = svPlayers[i].Character.firstName;
                      const newFirstName = firstName.slice(0, firstName.indexOf(firstName[1])); // Convers first name, to first letter (Lucy -> L)
                      blip.Name = `[${svPlayers[i].Character.job.callsign}] | ${newFirstName}. ${svPlayers[i].Character.lastName}`;
                    }
                  }
                }
              }
            // }
          }
        } else {
          console.log("can't create blips, as not on duty!")
        }
      } else {
        console.log("can't create blips, as not LEO/EMS/COfficer")
      }

      await Delay(1000);
    });
  }
}