import {Server} from "../server";
import { Inform, Error, logCommand } from "../utils";

import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";

import {Gravity} from "../controllers/staff/gravity";
import { StaffMenu } from "../controllers/staff/menu";

import {Ranks} from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { concatArgs, isDateValid } from "../../shared/utils";
import { Message } from "../../shared/models/ui/chat/message";
import { ChatTypes } from "../../shared/enums/ui/chat/types";

export class StaffManager {
  private readonly server: Server;

  // Controllers
  private gravityGun: Gravity;
  private staffMenu: StaffMenu;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  private registerCommands(): void {
    new Command("tpm", "Teleport to your waypoint", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.teleportToMarker);
        }
      }
    }, Ranks.Admin);
    
    new Command("goback", "Go back to your previous location, before you teleported.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.teleportBack);
        }
      }
    }, Ranks.Admin);

    new Command("showrank", "Show your rank in your name", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.showRank);
        }
      }
    }, Ranks.Moderator);

    new Command("sudo", "Sudo someone to send a chat message as them", [{name: "server_id", help: "Server ID of the person to sudo"}, {name: "content", help: "The content of the chat message"}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(args[0]);
        if (player) {
          if (args[1]) {
            const sudoMessage = new Message(concatArgs(1, args), ChatTypes.Global);
            const character = await this.server.characterManager.Get(player);

            if (character) {
              emitNet(Events.sendClientMessage, -1, sudoMessage, `${player.GetName} | ${character.Name}`);
            } else {
              emitNet(Events.sendClientMessage, -1, sudoMessage, player.GetName);
            }
            
            await logCommand("/sudo", player);
          } else {
            Error("Ban Command", "Ban date not entered | format (YY-MM-DD)!");
          }
        } else {
          Error("Ban Command", "There is no one in the server with that server ID!");
        }
      } else {
        Error("Ban Command", "Server ID not entered!");
      }
    }, Ranks.Management);
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
      // NOTES
      // - First arg is the players license
      // - Second arg is a DOB format (31/12/9999)
      // - Third arg is the ban reason

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
                  const ban = new Ban(player.Id, player.HardwareId, banReason, player.Id, date);
                  ban.OfflineBan = true;
                  await ban.save();
                } else {
                  Error("Ban Command", "You can't ban management or above!");
                }
              } else {
                Error("Ban Command", "No ban reason provided!");
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
    this.staffMenu = new StaffMenu(this.server);
    this.staffMenu.init();
    
    this.registerCommands();
    this.registerRCONCommands();
  }
}
