import { Player  } from "../models/database/player";

import * as Database from "./database/database";
import { PlayerManager } from "./players";


import { Events } from "../../shared/enums/events";
import { Server } from "../server";
import {ErrorCodes} from "../../shared/enums/errors";
import {Ranks} from "../../shared/enums/ranks";

import { Log, Error, Inform, Delay } from "../utils";
import * as sharedConfig from "../../configs/shared.json";
import {Ban} from "../models/database/ban";

const adaptiveCards = global.exports['adaptiveCards'];

export class ConnectionsManager {
  private server: Server;
  private playerManager: PlayerManager;
  public disconnectedPlayers: any[] = [];
  
  constructor(server: Server, playerManager: PlayerManager) {
    this.server = server;
    this.playerManager = playerManager;

    // Events
    on(Events.playerConnecting, async(name, setKickReason, deferrals) => {
      deferrals.defer()
      const src = (global as any).source;

      const player = new Player(src);
      const playerExists = await player.Exists();

      deferrals.update(`[${sharedConfig.serverName}]: Checking Player Data...`);
      await Delay(200);

      if (playerExists) { // If your DB entry exists
        const [isBanned, banData] = await this.server.banManager.playerBanned(player);
        if (isBanned) {
          if (player.GetRank < Ranks.Management) {
            if (banData.issued_by != player.id) {
              const results = await Database.SendQuery("SELECT `name`, `rank` FROM `players` WHERE `player_id` = :playerId", {
                playerId: banData.issued_by
              });

              if (results.data.length > 0) {
                const banDate = new Date(banData.issued_until);
                if (banDate.getFullYear() < 2099) {
                  deferrals.done(`\n \n [${sharedConfig.serverName}]: You were banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.id}\n\nBy: [${Ranks[results.data[0].rank]}] - ${results.data[0].name}\n\nReason: ${banData.reason}\n\nUnban Date: ${banDate.toUTCString()}.`);
                } else {
                  deferrals.done(`\n \n [${sharedConfig.serverName}]: You were permanently banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.id}\n\nBy: [${Ranks[results.data[0].rank]}] - ${results.data[0].name}\n\nReason: ${banData.reason}.`);
                }
                return;
              } else {
                deferrals.done(`[${sharedConfig.serverName}]: There was an issue checking your data, make a support ticket, with the provided error code.\n\nError Code: ${ErrorCodes.NoBannerFound}.`)
              }
            } else {
              const banDate = new Date(banData.issued_until);
              if (banDate.getFullYear() < 2099) {
                deferrals.done(`\n \n [${sharedConfig.serverName}]: You were banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.id}\n\nBy: System\n\nReason: ${banData.reason}\n\nUnban Date: ${banDate.toUTCString()}.`);
              } else {
                deferrals.done(`[${sharedConfig.serverName}]: You were permanently banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.id}\n\nBy: System\n\nReason: ${banData.reason}.`);
              }
            }
          }
        }

        deferrals.update(`[${sharedConfig.serverName}]: We're checking your name...`);

        if (player.GetRank < Ranks.Management && player.GetName.includes("<") || player.GetName.includes(">")) {
          const ban = new Ban(player.id, player.HardwareId, "We've detected you using the XSS exploit", player.id);
          await ban.save();
          deferrals.done(`[${sharedConfig.serverName}]: You've been permanently banned from ${sharedConfig.serverName}.\nBan Id: #${ban.Id}\nBy: System\nReason: ${ban.Reason}`);
          await this.playerManager.Remove(player.handle);
          return;
        }

        deferrals.update(`[${sharedConfig.serverName}]: Updating Player Data...`);
        await Delay(200);

        const updatedData = player.Update();
        if (updatedData) {
          if (this.server.IsDebugging) {
            Log("Connection Manager", `DB Player (${player.GetName}) Result Updated!`);
          }
        }
      } else {
        if (this.server.IsDebugging) {
          Error("Connection Manager", "No DB entry found, make one!")
        }
        deferrals.update(`[${sharedConfig.serverName}]: Creating Player Data...`);
        await Delay(200);

        const insertedData = await player.Insert();
        if (insertedData) {
          if (this.server.IsDebugging) {
            Log("Connection Manager", `DB Player (${player.GetName}) Result Created!`);
          }
        } else {
          deferrals.done(`[${sharedConfig.serverName}]: There was an error creating your information, make a support ticket, with the provided error code.\n\nError Code: ${ErrorCodes.NoInsert}.`)
          Error("Connection Manager", "There was an error creating your information")
          return;
        }
      }

      player.steamAvatar = await player.GetProfileAvatar(await player.GetIdentifier("steam"));

      if (this.server.Whitelisted) {
        Inform("Whitelist Check", "Whitelist Active!");
        const whitelisted = await player.Whitelisted();
        if (!whitelisted) {
          Inform("Whitelist Check", "Not whitelisted!");
          deferrals.done(`[${sharedConfig.serverName}]: Whitelist Active!`);
        } else {
          this.playerManager.Add(player);
          this.displayAdaptiveCard(player, deferrals);
        }
      } else {
        this.playerManager.Add(player);
        this.displayAdaptiveCard(player, deferrals);
      }
    });

    on(Events.playerDisconnected, async(reason: string) => {
      await playerManager.Disconnect(source, reason);
    });
  }

  // Methods
  private displayAdaptiveCard(player: Player, deferrals): void {
    deferrals.presentCard({
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.3",
      "body": [
        {
          "type": "Container",
          "items": [
            {
              "type": "TextBlock",
              "text": "\n",
              "wrap": true,
              "size": "Large",
              "weight": "Bolder",
              "color": "Light"
            },
            {
              "type": "Image",
              "url": "https://i.imgur.com/Miq0Jd4.png",
              "size": "300px",
              "horizontalAlignment": "center"
            },
            {
              "type": "TextBlock",
              "text": "\n\n",
              "wrap": true,
              "size": "Large",
              "weight": "Bolder",
              "color": "Light"
            },
            {
              "type": "TextBlock",
              "text": `Make sure to join our Discord for discussions, events and to read the rules. Also make sure to visit our website to apply for departments, document suggestions & bug reports, or even report a players.`,
              "wrap": true,
              "color": "Light",
              "size": "Medium",
              "horizontalAlignment": "center"
            },
            {
              "type": "TextBlock",
              "text": "\n",
              "wrap": true,
              "size": "Large",
              "weight": "Bolder",
              "color": "Light"
            },
            {
              "type": "Input.Toggle",
              "id": "acceptRules",
              "title": "I accept the servers Discord & FiveM rules & regulations",
              "wrap": true,
              "value": "false",
              "valueOn": "true",
              "valueOff": "false",
              "isRequired": true,
              "errorMessage": "You need to accept the rules to join the server!",
              "horizontalAlignment": "center"
            },
            {
              "type": "TextBlock",
              "text": "\n",
              "wrap": true,
              "size": "Large",
              "weight": "Bolder",
              "color": "Light"
            },
            {
              "type": "ColumnSet",
              "height": "stretch",
              "minHeight": "5px",
              "bleed": true,
              "selectAction": {
                "type": "Action.OpenUrl"
              },
              "columns": [
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "ActionSet",
                      "actions": [
                        {
                          "type": "Action.OpenUrl",
                          "title": "Discord",
                          "url": "https://discord.com/invite/JQPM99rs37",
                          "style": "positive",
                          "iconUrl": ""
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "ActionSet",
                      "actions": [
                        {
                          "type": "Action.Submit",
                          "title": "Play",
                          "style": "positive",
                          "id": "connect"
                        }
                      ]
                    }
                  ],
                  "backgroundImage": {}
                },
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "ActionSet",
                      "actions": [
                        {
                          "type": "Action.OpenUrl",
                          "title": "Website",
                          "style": "positive",
                          "url": "https://astridnetwork.com/"
                        }
                      ]
                    }
                  ]
                }
              ],
              "horizontalAlignment": "Center"
            }
          ],
          "style": "default",
          "bleed": true,
          "height": "stretch",
          "isVisible": true
        }
      ]
    }, async (data, rawData) => {
      // console.log("data", JSON.stringify(data), "rawData", JSON.stringify(rawData))
      if (data.submitId == "connect") {
        deferrals.handover({
          id: player.id,
          name: player.GetName,
          rank: Ranks[player.GetRank],
          playtime: await player.GetPlaytime.FormatTime(),
          avatar:  player.steamAvatar,
        })
        deferrals.done();
      }
    });
  }
}
