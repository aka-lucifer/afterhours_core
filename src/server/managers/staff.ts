import {Server} from "../server";
import { Inform, Error, logCommand } from "../utils";

import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";
import { Warning } from "../models/database/warning";

import {Gravity} from "../controllers/staff/gravity";
import { StaffMenu } from "../controllers/staff/menu";
import { GhostPlayers } from "../controllers/staff/ghostPlayers";

import * as Database from "../managers/database/database";

import {Ranks} from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { concatArgs, isDateValid } from "../../shared/utils";
import { Message } from "../../shared/models/ui/chat/message";
import { ChatTypes, SystemTypes } from "../../shared/enums/ui/chat/types";

export class StaffManager {
  private readonly server: Server;

  // Controllers
  public gravityGun: Gravity;
  private staffMenu: StaffMenu;
  public ghostPlayers: GhostPlayers;

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
    }, Ranks.Director);
    
    new Command("announce", "Make an administration announcement to the entire server.", [{name: "content", help: "The announcement you are going to be broadcasting."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source);
        if (player) {
          if (player.Spawned) {
            const message = concatArgs(0, args);
            const svPlayers = this.server.connectedPlayerManager.GetPlayers;

            for (let a = 0; a < svPlayers.length; a++) {
              if (svPlayers[a].Spawned) {
                await svPlayers[a].TriggerEvent(Events.sendSystemMessage, new Message(message, SystemTypes.Admin));
                await svPlayers[a].TriggerEvent(Events.showAnnouncement, message);
              }
            }
            
            await logCommand("/announce", player, message);
          }
        }
      } else {
        Error("Ban Command", "Server ID not entered!");
      }
    }, Ranks.Moderator);

    

    new Command("offline_ban", "Bans a player that has disconnected from the server", [{name: "player_license", help: "The game license of the player you're banning"}, {name: "banned_until", help: "The date the player is banned until - FORMAT (YYYY-MM-DD)"}, {name: "ban_reason", help: "The reason you're banning this player."}], true, async(source: string, args: any[]) => {
      // NOTES
      // - First arg is the players license
      // - Second arg is a DOB format (31/12/9999)
      // - Third arg is the ban reason

      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          if (args[0]) {
            const foundPlayer = await this.server.playerManager.getPlayerFromLicense(args[0]);
            if (foundPlayer) {
              if (args[1]) {
                const date = new Date(args[1]);
                if (isDateValid(date)) {
                  if (args[2]) {
                    const banReason = concatArgs(2, args);
                    if (foundPlayer.Rank < Ranks.Director) {
                      Inform("Offline Ban Command", `Banned: [${foundPlayer.Id}] - ${foundPlayer.GetName} | Until: ${date.toUTCString()} | For: ${banReason}`);
                      const ban = new Ban(foundPlayer.Id, foundPlayer.HardwareId, banReason, foundPlayer.Id, date);
                      ban.OfflineBan = true;
                      ban.OfflineReceiver = foundPlayer;
                      ban.IssuedBy = player;

                      await ban.save();
                    } else {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't ban management or above!", SystemTypes.Admin));
                      Error("Offline Ban Command", "You can't ban management or above!");
                    }
                  } else {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message("No ban reason provided!", SystemTypes.Admin));
                    Error("Offline Ban Command", "No ban reason provided!");
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("Entered date is invalid | format (YY-MM-DD)!", SystemTypes.Admin));
                  Error("Offline Ban Command", "Entered date is invalid | format (YY-MM-DD)!");
                }
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("Ban date not entered | format (YY-MM-DD)!", SystemTypes.Admin));
                Error("Offline Ban Command", "Ban date not entered | format (YY-MM-DD)!");
              }
            } else {
              await player.TriggerEvent(Events.sendSystemMessage, new Message("There is no player with that game license!", SystemTypes.Admin));
              Error("Offline Ban Command", "There is no player with that game license!");
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("Player license not entered!", SystemTypes.Admin));
            Error("Offline Ban Command", "Player license not entered!");
          }
        }
      }
    }, Ranks.Admin);
    
    new Command("offline_warn", "Warns a player that has disconnected from the server", [{name: "player_license", help: "The game license of the player you're banning"}, {name: "ban_reason", help: "The reason you're banning this player."}], true, async(source: string, args: any[]) => {
      // NOTES
      // - First arg is the players license
      // - Third arg is the ban reason

      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          if (args[0]) {
            const foundPlayer = await this.server.playerManager.getPlayerFromLicense(args[0]);
            if (foundPlayer) {
              if (args[1]) {
                const warnReason = concatArgs(1, args);
                if (foundPlayer.Rank < Ranks.Director) {
                  Inform("Offline Warn Command", `Warning: [${foundPlayer.Id}] - ${foundPlayer.GetName} | For: ${warnReason}`);
                  const warn = new Warning(foundPlayer.Id, warnReason, foundPlayer.Id)
                  warn.OfflineReceiver = foundPlayer;
                  warn.OfflineWarning = true;
                  warn.SystemWarning = true;
                  
                  const saved = await warn.save();
                  if (saved) {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've offline warned ^3${foundPlayer.GetName}^0, for ^3${warnReason}^0.`, SystemTypes.Admin));
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("You can't warn management or above!", SystemTypes.Admin));
                  Error("Offline Warn Command", "You can't warn management or above!");
                }
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("No warning reason provided!", SystemTypes.Admin));
                Error("Offline Warn Command", "No warning reason provided!");
              }
            }
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("There is no player with that game license!", SystemTypes.Admin));
          Error("Offline Warn Command", "There is no player with that game license!");
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("Player license not entered!", SystemTypes.Admin));
        Error("Offline Warn Command", "Player license not entered!");
      }
    }, Ranks.Moderator);
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
                if (player.Rank < Ranks.Director) {
                  Inform("Offline Ban Command", `Banned: [${player.Id} | ${player.Handle}] - ${player.GetName} | Until: ${date.toUTCString()} | For: ${banReason}`);
                  const ban = new Ban(player.Id, player.HardwareId, banReason, player.Id);
                  await ban.save();
                  ban.drop();
                } else {
                  Error("Offline Ban Command", "You can't ban management or above!");
                }
              } else {
                Error("Offline Ban Command", "No ban reason provided | format (YY-MM-DD)!");
              }
            } else {
              Error("Offline Ban Command", "Entered date is invalid | format (YY-MM-DD)!");
            }
          } else {
            Error("Offline Ban Command", "Ban date not entered | format (YY-MM-DD)!");
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
                if (player.Rank < Ranks.Director) {
                  Inform("Ban Command", `Banned: [${player.Id}] - ${player.GetName} | Until: ${date.toUTCString()} | For: ${banReason}`);
                  const ban = new Ban(player.Id, player.HardwareId, banReason, player.Id, date);
                  ban.OfflineBan = true;
                  ban.OfflineReceiver = player;

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

    RegisterCommand("unban", async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.playerManager.getPlayerFromLicense(args[0]);
        if (player) {
          const bans = this.server.banManager.GetBans;
          for (let i = 0; i < bans.length; i++) {
            const deletedBans = await Database.SendQuery("DELETE FROM `player_bans` WHERE `player_id` = :playerId", {
              playerId: player.Id
            });
        
            if (deletedBans.meta.affectedRows > 0) {
              console.log(`Deleting Players Bans (Id: ${bans[i].Id} | Player Id: ${bans[i].ReceiverId} | Name: ${player.GetName})`);
              this.server.banManager.Remove(bans[i].Id);
            }
          }
        } else {
          Error("Ban Command", "There is no player with that game license!");
        }
      } else {
        Error("Ban Command", "Player license not entered!");
      }
    }, false);
    
    RegisterCommand("offline_warn", async(source: string, args: any[]) => {
      // NOTES
      // - First arg is the players license
      // - Third arg is the ban reason

      if (args[0]) {
        const player = await this.server.playerManager.getPlayerFromLicense(args[0]);
        if (player) {
          if (args[1]) {
            const warnReason = concatArgs(1, args);
            if (player.Rank < Ranks.Director) {
              Inform("Offline Warn Command", `Warning: [${player.Id}] - ${player.GetName} | For: ${warnReason}`);
              const warn = new Warning(player.Id, warnReason, player.Id)
              warn.OfflineReceiver = player;
              warn.OfflineWarning = true;
              warn.SystemWarning = true;
              
              const saved = await warn.save();
              if (saved) {
                Inform("Offline Warn Command", `Warned: [${player.Id}] - ${player.GetName} | For: ${warnReason}`);
              }
            } else {
              Error("Offline Warn Command", "You can't warn management or above!");
            }
          } else {
            Error("Offline Warn Command", "No warning reason provided!");
          }
        } else {
          Error("Offline Warn Command", "There is no player with that game license!");
        }
      } else {
        Error("Offline Warn Command", "Player license not entered!");
      }
    }, false);
  }
  
  public init(): void {
    this.gravityGun = new Gravity(this.server);
    this.staffMenu = new StaffMenu(this.server);
    this.ghostPlayers = new GhostPlayers(this.server);
    
    this.staffMenu.init();
    
    this.registerCommands();
    this.registerRCONCommands();
  }
}
