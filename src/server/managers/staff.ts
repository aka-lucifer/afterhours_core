import {Server} from "../server";
import { Inform, Error } from "../utils";

import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";

import {Gravity} from "../controllers/staff/gravity";

import {Ranks} from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { concatArgs, isDateValid } from "../../shared/utils";

export class StaffManager {
  private readonly server: Server;

  // Controllers
  private gravityGun: Gravity;

  constructor(server: Server) {
    this.server = server;

    this.registerCommands();
    this.registerRCONCommands();
  }

  // Methods

  private registerCommands(): void {
    new Command("vehclear", "Clear the vehicles in the area", [], false, () => {
      emitNet(Events.clearWorldVehs, -1);
    }, Ranks.Admin);

    new Command("tpm", "Teleport to your waypoint", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.teleportToMarker);
        }
      }
    }, Ranks.Admin);
  }

  private registerRCONCommands(): void {
    RegisterCommand("ban", async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(args[0]);
        if (player) {
          if (args[1]) {
            const date = new Date(args[1]);
            if (isDateValid(date)) {
              if (args[2]) {
                const banReason = concatArgs(2, args);
                if (player.Rank < Ranks.Management) {
                  Inform("Ban Command", `Banned: [${player.Id} | ${player.Handle}] - ${player.GetName} | Until: ${date.toUTCString()} | For: ${banReason}`);
                  const ban = new Ban(player.Id, player.HardwareId, banReason, player.Id);
                  await ban.save();
                  ban.drop();
                } else {
                  Error("Ban Command", "You can't ban management or above!");
                }
              } else {
                Error("Ban Command", "No ban reason provided | format (YY-MM-DD)!");
              }
            } else {
              Error("Ban Command", "Entered date is invalid | format (YY-MM-DD)!");
            }
          } else {
            Error("Ban Command", "Ban date not entered | format (YY-MM-DD)!");
          }
        } else {
          Error("Ban Command", "There is no one in the server with that server ID!");
        }
      } else {
        Error("Ban Command", "Server ID not entered!");
      }
    }, false);

    RegisterCommand("offline_ban", async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.playerManager.getPlayerFromLicense(args[0]);
        if (player) {
          if (args[1]) {
            const date = new Date(args[1]);
            if (isDateValid(date)) {
              if (args[2]) {
                const banReason = concatArgs(2, args);
                if (player.Rank < Ranks.Management) {
                  Inform("Ban Command", `Banned: [${player.Id}] - ${player.GetName} | Until: ${date.toUTCString()} | For: ${banReason}`);
                  const ban = new Ban(player.Id, player.HardwareId, banReason, player.Id);
                  ban.OfflineBan = true;
                  await ban.save();
                } else {
                  Error("Ban Command", "You can't ban management or above!");
                }
              } else {
                Error("Ban Command", "No ban reason provided | format (YY-MM-DD)!");
              }
            } else {
              Error("Ban Command", "Entered date is invalid | format (YY-MM-DD)!");
            }
          } else {
            Error("Ban Command", "Ban date not entered | format (YY-MM-DD)!");
          }
        } else {
          Error("Ban Command", "There is no player with that game license!");
        }
      } else {
        Error("Ban Command", "Player license not entered!");
      }
    }, false);
  }
  
  public init(): void {
    this.gravityGun = new Gravity(this.server);
  }
}
