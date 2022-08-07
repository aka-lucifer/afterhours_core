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
      const svPlayers = this.server.connectedPlayerManager.GetPlayers;

      if (svPlayers.length > 0) { // If there are any players in the server
        let police = "";
        let cOfficers = "";
        let civilians = "";
        let unspawned = "";

        for (let i = 0; i < svPlayers.length; i++) {
          if (svPlayers[i].Spawned) {
            const playerCharacter = await this.server.characterManager.Get(svPlayers[i]);
            if (playerCharacter) {
              if (playerCharacter.isLeoJob() && playerCharacter.Job.Status) { // If LEO and on duty
                const rank = await getRankFromValue(playerCharacter.Job.rank, playerCharacter.Job.name);
                police = `${police}\n[${playerCharacter.Job.Callsign}] | ${formatFirstName(playerCharacter.firstName)}. ${playerCharacter.lastName} (${playerCharacter.Job.label} | ${rank})`;
              } else if (playerCharacter.Job.name === Jobs.Community && playerCharacter.Job.Status) { // If community officer and on duty
                cOfficers = `${cOfficers}\n[${svPlayers[i].Handle}] | ${formatFirstName(playerCharacter.firstName)}. ${playerCharacter.lastName}`;
              } else {
                civilians = `${civilians}\n[${svPlayers[i].Handle}] | ${svPlayers[i].GetName}`;
              }
            }
          } else {
            unspawned = `${unspawned}\n[${svPlayers[i].Handle}] | ${svPlayers[i].GetName}`
          }

          if (i === (svPlayers.length - 1)) {
            await this.server.logManager.Send(LogTypes.Players, new WebhookMessage({
              username: "Server Status", embeds: [{
                color: EmbedColours.Green,
                author: {
                  name: "Astrid Network Server Status",
                  icon_url: serverConfig.discordLogs.footerLogo
                },
                description: "**Direct Connect** - https://cfx.re/join/588967",
                fields: [
                  {
                    name: "Online Players",
                    value: `${svPlayers.length}/${this.server.GetMaxPlayers}`,
                    inline: false
                  },
                  {
                    name: "\u200B",
                    value: '\u200B',
                    inline: false
                  },
                  {
                    name: "Law Enforcement",
                    value: police.length > 0 ? police : "None",
                    inline: true
                  },
                  {
                    name: "Community Officers",
                    value: cOfficers.length > 0 ? cOfficers : "None",
                    inline: false
                  },
                  {
                    name: "Civilians",
                    value: civilians.length > 0 ? civilians : "None",
                    inline: false
                  },
                  {
                    name: "Unspawned",
                    value: unspawned.length > 0 ? unspawned : "None",
                    inline: false
                  }
                ],
                footer: {
                  text: `© ${sharedConfig.serverName} - ${new Date().getFullYear()}, All Rights Reserved`
                }
              }]
            }));
          }
        }
      } else {
        await this.server.logManager.Send(LogTypes.Players, new WebhookMessage({
          username: "Server Status", embeds: [{
            color: EmbedColours.Red,
            author: {
              name: "Astrid Network Server Status",
              icon_url: serverConfig.discordLogs.footerLogo
            },
            description: "**Direct Connect** - https://cfx.re/join/588967\n\nThere are no players in the server.",
            footer: {
              text: `© ${sharedConfig.serverName} - ${new Date().getFullYear()}, All Rights Reserved`
            }
          }]
        }));
      }
    }, 30000)
  }
}