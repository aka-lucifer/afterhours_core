import * as Database from "./database/database";

import { Server } from "../server";
import { Log, Error, Inform, Delay } from "../utils";

import { Player  } from "../models/database/player";
import {Ban} from "../models/database/ban";
import {BanStates} from "../enums/database/bans";

import { Events } from "../../shared/enums/events/events";
import {ErrorCodes} from "../../shared/enums/logging/errors";
import {Ranks} from "../../shared/enums/ranks";

import * as sharedConfig from "../../configs/shared.json";

export class ConnectionsManager {
  private server: Server;
  public disconnectedPlayers: any[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Events
    on(Events.playerConnecting, async(name, setKickReason, deferrals) => {
      deferrals.defer()
      const src = (global as any).source;
      deferrals.update(`[${sharedConfig.serverName}]: Obtaining Player Data...`);

      const player = new Player(src);
      const playerExists = await player.Exists();

      // Restrict server only to developers, if development mode is enabled
      if (this.server.Developing) {
        if (player.Rank < Ranks.Developer) {
          deferrals.done(`[${sharedConfig.serverName}]: Development mode is active and you are not a developer!`);
          return;
        }
      }

      deferrals.update(`[${sharedConfig.serverName}]: Checking Player Data...`);
      await Delay(200);

      if (playerExists) { // If your DB entry exists
        const myLicense = await player.GetIdentifier("license");
        if (player.Rank != Ranks.Developer && player.Rank < Ranks.Management && await this.server.connectedPlayerManager.Exists(myLicense)) {
          deferrals.done(`[${sharedConfig.serverName}]: There is already a player connected to the server, with this license key!`);
        }

        const [isBanned, banData] = await player.isBanned();
        if (isBanned) {
          if (player.Rank < Ranks.Management && banData.State == BanStates.Active) {
            if (banData.IssuedBy != player.id) {
              const results = await Database.SendQuery("SELECT `name`, `rank` FROM `players` WHERE `player_id` = :playerId", {
                playerId: banData.IssuedBy
              });

              if (results.data.length > 0) {
                const banDate = new Date(banData.IssuedUntil);
                if (banDate.getFullYear() < 2099) {
                  deferrals.done(`\n \n [${sharedConfig.serverName}]: You were banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.Id}\n\nBy: [${Ranks[results.data[0].rank]}] - ${results.data[0].name}\n\nReason: ${banData.Reason}\n\nUnban Date: ${banDate.toUTCString()}.`);
                } else {
                  deferrals.done(`\n \n [${sharedConfig.serverName}]: You were permanently banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.Id}\n\nBy: [${Ranks[results.data[0].rank]}] - ${results.data[0].name}\n\nReason: ${banData.Reason}.`);
                }
                return;
              } else {
                deferrals.done(`[${sharedConfig.serverName}]: There was an issue checking your data, make a support ticket, with the provided error code.\n\nError Code: ${ErrorCodes.NoBannerFound}.`)
              }
            } else {
              const banDate = new Date(banData.IssuedUntil);
              if (banDate.getFullYear() < 2099) {
                deferrals.done(`\n \n [${sharedConfig.serverName}]: You were banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.Id}\n\nBy: System\n\nReason: ${banData.Reason}\n\nUnban Date: ${banDate.toUTCString()}.`);
              } else {
                deferrals.done(`[${sharedConfig.serverName}]: You were permanently banned from ${sharedConfig.serverName}.\n\nBan Id: #${banData.Id}\n\nBy: System\n\nReason: ${banData.Reason}.`);
              }
            }

            // await server.connectedPlayerManager.Remove(player.handle);
          }
        }

        deferrals.update(`[${sharedConfig.serverName}]: We're checking your name...`);

        if (player.Rank < Ranks.Management && player.GetName.includes("<") || player.GetName.includes(">")) {
          const ban = new Ban(player.id, player.HardwareId, "We've detected you using the XSS exploit", player.id);
          await ban.save();
          deferrals.done(`[${sharedConfig.serverName}]: You've been permanently banned from ${sharedConfig.serverName}.\nBan Id: #${ban.Id}\nBy: System\nReason: ${ban.Reason}`);
          // await server.connectedPlayerManager.Remove(player.handle);
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
          await this.displayAdaptiveCard(player, deferrals);
        }
      } else {
        await this.displayAdaptiveCard(player, deferrals);
      }
    });

    on(Events.playerDisconnected, async(reason: string) => {
      await server.connectedPlayerManager.Disconnect(source.toString(), reason);
    });
  }

  // Methods
  private async displayAdaptiveCard(player: Player, deferrals): Promise<void> {
    if (player.Rank < Ranks.Admin) {
      deferrals.presentCard({
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.3",
        "body": [
          {
              "type":"Image",
              "url": "https://i.imgur.com/ca5O3ag.png",
              "horizontalAlignment":"Center"
          },
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
      }, async (data) => {
        console.log("data", JSON.stringify(data))
        if (data.submitId == "connect") {
          console.log("Send over loading screen data", player.id, player.GetName, Ranks[player.Rank], player.FormatRank, await player.GetPlaytime.FormatTime(), player.steamAvatar, this.server.Developing);
          deferrals.handover({
            id: player.id,
            name: player.GetName,
            rank: Ranks[player.Rank],
            playtime: await player.GetPlaytime.FormatTime(),
            avatar:  player.steamAvatar,
            development: this.server.Developing
          });

          deferrals.done();
          // await this.server.connectedPlayerManager.Add(player);
        }
      });
    } else {
      console.log("Send over loading screen data", player.id, player.GetName, Ranks[player.Rank], player.FormatRank, await player.GetPlaytime.FormatTime(), player.steamAvatar, this.server.Developing);
      deferrals.handover({
        id: player.id,
        name: player.GetName,
        rank: Ranks[player.Rank],
        playtime: await player.GetPlaytime.FormatTime(),
        avatar:  player.steamAvatar,
        development: this.server.Developing
      });

      deferrals.done();
      // await this.server.connectedPlayerManager.Add(player);
    }
  }
}
