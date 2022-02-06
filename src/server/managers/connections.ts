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


export class ConnectionsManager {
  private server: Server;
  private playerManager: PlayerManager;
  
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
        this.playerManager.Add(player);

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

      if (this.server.Whitelisted) {
        Inform("Whitelist Check", "Whitelist Active!");
        const whitelisted = await player.Whitelisted();
        if (!whitelisted) {
          Inform("Whitelist Check", "Not whitelisted!");
          deferrals.done(`[${sharedConfig.serverName}]: Whitelist Active!`);
        } else {
          deferrals.done();
        }
      } else {
        deferrals.done();
      }
    })

    on(Events.playerDisconnected, async(reason: string) => {
      await playerManager.Disconnect(source, reason);
    });
  }
}
