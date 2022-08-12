import { Server } from "../../../server";

import { LogTypes } from "../../../enums/logging";

import WebhookMessage from "../../../models/webhook/discord/webhookMessage";

import { Jobs } from "../../../../shared/enums/jobs/jobs";
import { formatFirstName, getRankFromValue } from "../../../../shared/utils";
import { EmbedColours } from "../../../../shared/enums/logging/embedColours";

import serverConfig from "../../../../configs/server.json";
import sharedConfig from "../../../../configs/shared.json";

export class ServerStatus {
  private server: Server;

  private interval: NodeJS.Timeout;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public start(): void {
    if (!this.server.Developing) this.interval = setInterval(async() => {
    // this.interval = setInterval(async() => {
      const svPlayers = this.server.connectedPlayerManager.GetPlayers;

      if (svPlayers.length > 0) { // If there are any players in the server
        let police = "";
        let cOfficers = "";
        let civilians = "";
        let unspawned = "";

        for (let i = 0; i < svPlayers.length; i++) {
          const ping = svPlayers[i].RefreshPing();
          let pingType = "";

          if (ping <= 80) {
            pingType = "LOW_PING";
          } else if (ping < 150 && ping > 80) {
            pingType = "MEDIUM_PING";
          } else if (ping > 150) {
            pingType = "HIGH_PING";
          }

          if (svPlayers[i].Spawned) {
            const playerCharacter = await this.server.characterManager.Get(svPlayers[i]);
            if (playerCharacter) {
              if (playerCharacter.isLeoJob() && playerCharacter.Job.Status) { // If LEO and on duty
                const rank = await getRankFromValue(playerCharacter.Job.rank, playerCharacter.Job.name);
                if (police.length <= 0) {
                  police = pingType + " | `[" + playerCharacter.Job.Callsign + "] | " + formatFirstName(playerCharacter.firstName) + ". " + playerCharacter.lastName + "(" + playerCharacter.Job.label + " | " + rank + ")`";
                } else {
                  police = police + "\n" + pingType + " | `[" + playerCharacter.Job.Callsign + "] | " + formatFirstName(playerCharacter.firstName) + ". " + playerCharacter.lastName + "(" + playerCharacter.Job.label + " | " + rank + ")`";
                }
              } else if (playerCharacter.Job.name === Jobs.Community && playerCharacter.Job.Status) { // If community officer and on duty
                if (cOfficers.length <= 0) {
                  cOfficers = pingType + " | `[" + svPlayers[i].Handle + "] | " + formatFirstName(playerCharacter.firstName) + ". " + playerCharacter.lastName + "`";
                } else {
                  cOfficers = cOfficers + "\n" + pingType + " | `[" + svPlayers[i].Handle + "] | " + formatFirstName(playerCharacter.firstName) + ". " + playerCharacter.lastName + "`";
                }
              } else {
                if (civilians.length <= 0) {
                  civilians = pingType + " | `[" + svPlayers[i].Handle + "] | " + svPlayers[i].GetName + "`";
                } else {
                  civilians = civilians + "\n" + pingType + " | `[" + svPlayers[i].Handle + "] | " + svPlayers[i].GetName + "`";
                }
              }
            }
          } else {
            if (unspawned.length <= 0) {
              unspawned = pingType + " | `[" + svPlayers[i].Handle + "] | " + svPlayers[i].GetName + "`";
            } else {
              unspawned = unspawned + "\n" + pingType + " | `[" + svPlayers[i].Handle + "] | " + svPlayers[i].GetName + "`";
            }
          }

          if (i === (svPlayers.length - 1)) {
            SetConvarServerInfo("onlinePolice", police.length > 0 ? police : "None");
            SetConvarServerInfo("onlineCommunity", cOfficers.length > 0 ? cOfficers : "None");
            SetConvarServerInfo("onlineCivs", civilians.length > 0 ? civilians : "None");
            SetConvarServerInfo("onlineUnspawned", unspawned.length > 0 ? unspawned : "None");
          }
        }
      } else {
        SetConvarServerInfo("onlinePolice", "None");
        SetConvarServerInfo("onlineCommunity", "None");
        SetConvarServerInfo("onlineCivs", "None");
        SetConvarServerInfo("onlineUnspawned", "None");
      }
    }, 30000)
  }
}