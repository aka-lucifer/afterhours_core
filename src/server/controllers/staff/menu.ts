import { Vector3 } from "fivem-js";

import { Server } from "../../server";
import { addZero, Capitalize, Delay } from "../../utils";

import { LogTypes } from "../../enums/logging";

import { Kick } from "../../models/database/kick";
import { Warning } from "../../models/database/warning";
import { Commend } from "../../models/database/commend";
import { Ban } from "../../models/database/ban";
import { ClientCallback } from "../../models/clientCallback";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import { formatSplitCapitalString, splitCapitalsString } from "../../../shared/utils";
import { JobLabels, Jobs } from "../../../shared/enums/jobs/jobs";
import { EmbedColours } from "../../../shared/enums/logging/embedColours";
import { AdminActions } from "../../../shared/enums/adminActions";

import serverConfig from "../../../configs/server.json";
import sharedConfig from "../../../configs/shared.json";

interface ConnectedPlayer {
  netId: string;
  coords: Vector3;
  heading: number;
  name: string,
  rank: Ranks,
  inVeh: boolean;
  vehType?: string
}

export class StaffMenu {
  private server: Server;

  // Ticks
  private playerBlipTicks: number = undefined;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.logAdminAction, this.EVENT_logAdminAction.bind(this));

    // [Events | Connected Players]
    onNet(Events.banPlayer, this.EVENT_banPlayer.bind(this));
    onNet(Events.kickPlayer, this.EVENT_kickPlayer.bind(this));
    onNet(Events.warnPlayer, this.EVENT_warnPlayer.bind(this));
    onNet(Events.commendPlayer, this.EVENT_commendPlayer.bind(this));
    onNet(Events.updatePlayerRank, this.EVENT_updatePlayerRank.bind(this));
    onNet(Events.freezePlayer, this.EVENT_freezePlayer.bind(this));
    onNet(Events.tpToPlayer, this.EVENT_tpToPlayer.bind(this));
    onNet(Events.tpToVehicle, this.EVENT_tpToVehicle.bind(this));
    onNet(Events.summonPlayer, this.EVENT_summonPlayer.bind(this));
    onNet(Events.returnSummonedPlayer, this.EVENT_returnSummonedPlayer.bind(this));
    onNet(Events.spectatePlayer, this.EVENT_spectatePlayer.bind(this));

    // [Events | Server Management]
    onNet(Events.changeWeather, this.EVENT_changeWeather.bind(this));
    onNet(Events.changeTime, this.EVENT_changeTime.bind(this));
    onNet(Events.bringAll, this.EVENT_bringAll.bind(this));
    onNet(Events.freezeAll, this.EVENT_freezeAll.bind(this));

    // Callbacks
    onNet(Callbacks.updatePlayerJob, this.CALLBACK_updatePlayerJob.bind(this));
  }

  // Methods
  private startPlayerBlips(): void {
    if (this.playerBlipTicks === undefined) this.playerBlipTicks = setTick(async() => {
      // loop through on duty LEO, Fire/EMS & Community Officers and send their location and info to every on duty client.
      const svPlayers = this.server.connectedPlayerManager.GetPlayers;
      const connectedPlayers: ConnectedPlayer[] = [];

      for (let a = 0; a < svPlayers.length; a++) { // Loop through all server players
        if (svPlayers[a].Spawned) {
          const ped = GetPlayerPed(svPlayers[a].Handle); // Get their characters ped
          const currVeh = GetVehiclePedIsIn(ped, false); // Check if they're inside a vehicle

          connectedPlayers.push({ // Push new element into active units array.
            netId: svPlayers[a].Handle,
            coords: svPlayers[a].Position,
            heading: Math.ceil(GetEntityHeading(ped)),
            name: svPlayers[a].GetName,
            rank: svPlayers[a].Rank,
            inVeh: currVeh > 0,
            vehType: GetVehicleType(currVeh)
          });
        }

        if (a == (svPlayers.length - 1)) { // Once we're on the last entry in connected players, send all active units to every client
          for (let b = 0; b < svPlayers.length; b++) {
            if (svPlayers[b].Rank >= Ranks.Admin) {
              await svPlayers[b].TriggerEvent(Events.updatePlayerBlips, connectedPlayers);
            }
          }
        }
      }

      await Delay(1500);
    });
  }

  private async updateRank(myPlayer: any, otherPlayer: any, newRank: Ranks): Promise<void> {
    const updatedRank = await otherPlayer.UpdateRank(newRank);
    if (updatedRank) {
      console.log("give them honourable or above");
      const rankLabelSplit = splitCapitalsString(Ranks[myPlayer.Rank]);
      const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

      const newRankLabelSplit = splitCapitalsString(Ranks[newRank]);
      const formattedNewRankLabel = formatSplitCapitalString(newRankLabelSplit);

      await myPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You've gave ^3${otherPlayer.GetName}^0 the rank ^3${formattedNewRankLabel}^0.`, SystemTypes.Admin));
      await otherPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`^3[${formattedRankLabel}] ^0- ^3${myPlayer.GetName}^0 has updated your rank to ^3${formattedNewRankLabel}^0.`, SystemTypes.Admin));

      const updatersDiscord = await myPlayer.GetIdentifier("discord");
      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
        username: "Staff Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Rank Updated__",
          description: `A player has had his rank updated.\n\n**Username**: ${otherPlayer.GetName}\n**New Rank**: ${Ranks[newRank]}\n**Updated By**: ${myPlayer.GetName}\n**Updaters Rank**: ${Ranks[myPlayer.Rank]}\n**Updaters Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
          footer: {
            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
            icon_url: sharedConfig.serverLogo
          }
        }]
      }));
    }
  }

  public init(): void {
    this.startPlayerBlips();
  }

  private havePermission(rank: Ranks): boolean {
    let havePermission = rank >= Ranks.Admin;

    if (!this.server.Developing) { // If this server is the development server
      if (rank == Ranks.Developer) havePermission = false; // Check if we're a dev, if we are, disable banning on public server
    }

    return havePermission;
  }

  // Events  [Connected Players]
  private async EVENT_banPlayer(playerId: number, banReason: string, banPermanent: boolean, banType?: string, banLength?: number): Promise<void> {
    if (playerId > 0) {
      if (banReason != null) {
        if (banReason.length > 0) {
          const player = await this.server.connectedPlayerManager.GetPlayer(source);
          if (player) {
            const havePerm = this.havePermission(player.Rank);
            console.log("have permission!", havePerm);

            if (havePerm) {
              // if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  // if (foundPlayer.Rank < player.Rank) {
                    let banSeconds = 0;
                    if (!banPermanent) {
                      if (banType == "SECONDS") {
                        banSeconds = Number(banLength);
                      } else if (banType == "MINUTES") {
                        banSeconds = Number(banLength) * 60;
                      } else if (banType == "HOURS") {
                        banSeconds = Number(banLength) * 3600;
                      } else if (banType == "DAYS") {
                        banSeconds = Number(banLength) * 86400;
                      } else if (banType == "WEEKS") {
                        banSeconds = Number(banLength) * 604800;
                      } else if (banType == "MONTHS") {
                        banSeconds = Number(banLength) * 2628000;
                      } else {
                        banSeconds = Number(banLength);
                      }
                    }

                    const currDate = new Date();
                    const newDate = new Date(currDate.setSeconds(currDate.getSeconds() + banSeconds));

                    if (!banPermanent) {
                      const ban = new Ban(foundPlayer.Id, foundPlayer.HardwareId, banReason, player.Id, newDate);
                      ban.Banner = player;
                      const saved = await ban.save();
                      
                      if (saved) {
                        ban.drop();
                        await player.Notify("Ban", `You've banned ${foundPlayer.GetName}, for ${banReason}, until ${newDate.toUTCString()}.`, NotificationTypes.Info, 5000);
                      }
                    } else {
                      const ban = new Ban(foundPlayer.Id, foundPlayer.HardwareId, banReason, player.Id);
                      ban.Banner = player;
                      const saved = await ban.save();

                      if (saved) {
                        ban.drop();
                        await player.Notify("Ban", `You've permanently banned ${foundPlayer.GetName}, for ${banReason}.`, NotificationTypes.Info, 5000);
                      }
                    }
                  // } else {
                  //   await player.Notify("Ban", "You can't ban someone who has a higher rank than you!", NotificationTypes.Error);
                  // }
                } else {
                  await player.Notify("Ban", "Player not found!", NotificationTypes.Error);
                }
              // } else {
              //   await player.Notify("Ban", "You can't ban yourself!", NotificationTypes.Error);
              // }
            }
          }
        } else {
          console.log("no ban reason 2!");
        }
      } else {
        console.log("no ban reason 1!");
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_kickPlayer(playerId: number, kickReason: string): Promise<void> {
    if (playerId > 0) {
      if (kickReason != null) {
        if (kickReason.length > 0) {
          const player = await this.server.connectedPlayerManager.GetPlayer(source);
          if (player) {
            const havePerm = this.havePermission(player.Rank);
            console.log("have permission!", havePerm);

            if (havePerm) {
              // if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  // if (foundPlayer.Rank < player.Rank) {
                    const kick = new Kick(foundPlayer.Id, kickReason, player.Id);
                    kick.Kicker = player;
  
                    const saved = await kick.save();
                    if (saved) {
                      kick.drop();
                      await player.Notify("Kick", `You've kicked ${foundPlayer.GetName}, for ${kickReason}.`, NotificationTypes.Info, 5000);
                    }
                  // } else {
                  //   await player.Notify("Kick", "You can't kick someone who has a higher rank than you!", NotificationTypes.Error);
                  // }
                } else {
                  await player.Notify("Kick", "Player not found!", NotificationTypes.Error);
                }
              // } else {
              //   await player.Notify("Kick", "You can't kick yourself!", NotificationTypes.Error);
              // }
            }
          }
        } else {
          console.log("no kick reason 2!");
        }
      } else {
        console.log("no kick reason 1!");
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_warnPlayer(playerId: number, warnReason: string): Promise<void> {
    if (playerId > 0) {
      if (warnReason != null) {
        if (warnReason.length > 0) {
          const player = await this.server.connectedPlayerManager.GetPlayer(source);
          if (player) {
            const havePerm = this.havePermission(player.Rank);
            console.log("have permission!", havePerm);

            if (havePerm) {
              // if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  // if (foundPlayer.Rank < player.Rank) {
                    const warning = new Warning(foundPlayer.Id, warnReason, player.Id);
                    warning.Warner = player;
                    
                    const saved = await warning.save();
                    if (saved) {
                      await warning.send();
                      await player.Notify("Warn", `You've warned ${foundPlayer.GetName}, for ${warnReason}.`, NotificationTypes.Info, 5000);
                    }
                  // } else {
                  //   await player.Notify("Warn", "You can't warn someone who has a higher rank than you!", NotificationTypes.Error);
                  // }
                } else {
                  await player.Notify("Warn", "Player not found!", NotificationTypes.Error);
                }
              // } else {
              //   await player.Notify("Warn", "You can't warn yourself!", NotificationTypes.Error);
              // }
            }
          }
        } else {
          console.log("no warn reason 2!");
        }
      } else {
        console.log("no warn reason 1!");
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_commendPlayer(playerId: number, commendReason: string): Promise<void> {
    if (playerId > 0) {
      if (commendReason != null) {
        if (commendReason.length > 0) {
          const player = await this.server.connectedPlayerManager.GetPlayer(source);
          if (player) {
            const havePerm = this.havePermission(player.Rank);
            console.log("have permission!", havePerm);

            if (havePerm) {
              // if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  const commend = new Commend(foundPlayer.Id, commendReason, player.Id);
                  const saved = await commend.save();
                  if (saved) {
                    await player.Notify("Commend", `You've commended ${foundPlayer.GetName}, for ${commendReason}.`, NotificationTypes.Info, 5000);
                    await commend.log();
                  }
                } else {
                  await player.Notify("Commend", "Player not found!", NotificationTypes.Error);
                }
              // } else {
              //   await player.Notify("Commend", "You can't commend yourself!", NotificationTypes.Error);
              // }
            }
          }
        } else {
          console.log("no commend reason 2!");
        }
      } else {
        console.log("no commend reason 1!");
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_updatePlayerRank(playerId: number, newRank: Ranks): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          // if (player.Id !== playerId) {
            // const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);
            const foundPlayer = player;

            if (foundPlayer) {
              const hasBypass = player.Rank >= Ranks.Management ? true : false; // If you have management bypass or not
              if (!hasBypass) { // If you don't have the management rank bypass
                if (newRank < player.Rank) { // If the new rank is less than yours (double check, since we have already done this on our client)
                  if (newRank >= Ranks.Honorable) { // If the rank is honourable or above (Honourable, Trusted, All of staff)
                    const canHaveRank = foundPlayer.Trustscore >= serverConfig.trustscore.honourableRequirement ? true : false; // Trustscore auto checks bans/kicks & warnings, so we don't have to
                    if (canHaveRank) { // If their trustscore is high enough, give them the rank
                      const updatedRank = await foundPlayer.UpdateRank(newRank);
                      if (updatedRank) {
                        console.log("give them honourable or above");
                        this.updateRank(player, foundPlayer, newRank);
                      } else {
                        await player.TriggerEvent(Events.sendSystemMessage, new Message(`There was an error updating this players rank!`, SystemTypes.Admin));
                      }
                    } else { // Their trustscore is too low
                      console.log("this person has too low of a trustscore to do this, contact management if they really deserve/need it bitch!");
                    }
                  } else {
                    const updatedRank = await foundPlayer.UpdateRank(newRank);
                    if (updatedRank) { // Give them their new rank (user & donator ranks [these ranks aren't used yet, just a placeholder, if we decide to])
                      console.log("gave the new rank!");
                      this.updateRank(player, foundPlayer, newRank);
                      // const rankLabelSplit = splitCapitalsString(Ranks[player.Rank]);
                      // const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

                      // const newRankLabelSplit = splitCapitalsString(Ranks[newRank]);
                      // const formattedNewRankLabel = formatSplitCapitalString(newRankLabelSplit);

                      // await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've gave ^3${foundPlayer.GetName}^0 the rank ^3${newRankLabelSplit}^0.`, SystemTypes.Admin));
                      // await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`^3[${formattedRankLabel}] ^0- ^3${player.GetName}^0 has updated your rank to ^3${newRankLabelSplit}^0.`, SystemTypes.Admin));
                    } else {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`There was an error updating this players rank!`, SystemTypes.Admin));
                    }
                  }
                } else { // Their new rank is the same or higher than yours, so deny
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You can't give someone a rank higher than or the same as yours!`, SystemTypes.Admin));
                }
              } else { // You're management so u can give whatever u want slut
                const updatedRank = await foundPlayer.UpdateRank(newRank);
                if (updatedRank) {
                  this.updateRank(player, foundPlayer, newRank);
                  // const rankLabelSplit = splitCapitalsString(Ranks[player.Rank]);
                  // const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

                  // const newRankLabelSplit = splitCapitalsString(Ranks[newRank]);
                  // const formattedNewRankLabel = formatSplitCapitalString(newRankLabelSplit);

                  // await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've gave ^3${foundPlayer.GetName}^0 the rank ^3${newRankLabelSplit}^0.`, SystemTypes.Admin));
                  // await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`^3[${formattedRankLabel}] ^0- ^3${player.GetName}^0 has updated your rank to ^3${newRankLabelSplit}^0.`, SystemTypes.Admin));
                  console.log("gave them new rank")
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`There was an error updating this players rank!`, SystemTypes.Admin));
                }
              }
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
          //   await player.Notify("Commend", "You can't commend yourself!", NotificationTypes.Error);
          // }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_freezePlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              const ped = GetPlayerPed(foundPlayer.Handle);
              const states = Player(foundPlayer.Handle);

              if (ped > 0) {
                states.state.frozen = !states.state.frozen;
                FreezeEntityPosition(ped, states.state.frozen);
                
                const currVeh = GetVehiclePedIsIn(ped, false);
                if (GetVehiclePedIsIn(ped, false) > 0) {
                  FreezeEntityPosition(currVeh, states.state.frozen);
                }

                if (states.state.frozen) {
                  await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You've been frozen by ${player.GetName}.`, SystemTypes.Admin));
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've frozen ${foundPlayer.GetName}.`, SystemTypes.Admin));
        
                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Red,
                      title: "__Player Frozen__",
                      description: `A player has been frozen.\n\n**Username**: ${foundPlayer.GetName}\n**Rank**: ${Ranks[foundPlayer.Rank]}\n**Freezers Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else {
                  await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You've been unfrozen by ${player.GetName}.`, SystemTypes.Admin));
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've unfrozen ${foundPlayer.GetName}.`, SystemTypes.Admin));
        
                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Unfrozen__",
                      description: `A player has been unfrozen.\n\n**Username**: ${foundPlayer.GetName}\n**Rank**: ${Ranks[foundPlayer.Rank]}\n**Freezers Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                }
              }
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
          //   await player.Notify("Staff Menu", "You can't freeze yourself!", NotificationTypes.Error);
          // }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_tpToPlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              await player.TriggerEvent(Events.goToPlayer, Object.assign({}, foundPlayer), foundPlayer.Position);

              const playersDiscord = await player.GetIdentifier("discord");
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Player Teleported__",
                  description: `A player has to teleported to another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Teleported To**: ${foundPlayer.GetName}\n**Teleportees Rank**: ${Ranks[foundPlayer.Rank]}\n**Teleporters Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
          //   await player.Notify("Staff Menu", "You can't teleport to yourself!", NotificationTypes.Error);
          // }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_tpToVehicle(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        if (havePerm) {
          if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              const foundPed = GetPlayerPed(foundPlayer.Handle);

              if (foundPed > 0) {
                let tpVehicle = GetVehiclePedIsIn(foundPed, false);

                if (tpVehicle > 0) {
                  this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.getVehicleFreeSeat, foundPlayer.Handle, {netId: NetworkGetNetworkIdFromEntity(tpVehicle)}, async (cbState, passedData) => {
                    if (cbState == "SEATS_FREE") {
                      const foundPosition = foundPlayer.Position;

                      // TP to their location
                      const myPed = GetPlayerPed(player.Handle);
                      SetEntityCoords(myPed, foundPosition.x, foundPosition.y, foundPosition.z, false, false, false, false);

                      // Spawn inside the vehicle
                      await Delay(500); // Have a half a second delay, to make sure we've teleported inside the players scope.
                      tpVehicle = GetVehiclePedIsIn(foundPed, false); // Redefine the vehicle
                      
                      // TP into the vehicle
                      SetPedIntoVehicle(myPed, tpVehicle, passedData.freeSeat); // See if this places u into other seats, if that seat is full

                      const playersDiscord = await player.GetIdentifier("discord");
                      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                        username: "Staff Logs", embeds: [{
                          color: EmbedColours.Green,
                          title: "__Player Teleported Into Vehicle__",
                          description: `A player has to teleported into another players vehicle.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Teleported To**: ${foundPlayer.GetName}\n**Teleportees Rank**: ${Ranks[foundPlayer.Rank]}\n**Teleporters Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                          footer: {
                            text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                            icon_url: sharedConfig.serverLogo
                          }
                        }]
                      }));
                    } else if (cbState == "NO_SEATS_FOUND") {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`Unable to find an available seat inside ^3${foundPlayer.GetName}^0's vehicle!`, SystemTypes.Error));
                    } else if (cbState == "ERROR") {
                      console.log("TP VEH ERROR TINGS!");
                    }
                  }));
                } else {
                  await player.Notify("Staff Menu", "This player isn't inside a vehicle!", NotificationTypes.Error);
                }
              }
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Staff Menu", "You can't teleport to yourself!", NotificationTypes.Error);
          }
        }
      }
    }
  }
  
  private async EVENT_summonPlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.getSummoned, foundPlayer.Handle, {player: Object.assign({}, player), playerPos: player.Position}, async (cbState, passedData) => {
                if (cbState == "SUCCESS") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've summoned ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));

                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Summoned__",
                      description: `A player has been summoned.\n\n**Username**: ${foundPlayer.GetName}\n**Rank**: ${Ranks[foundPlayer.Rank]}\n**Summoned By**: ${player.GetName}\n**Summoners Rank**: ${Ranks[player.Rank]}\n**Summoners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else if (cbState == "ERROR_TPING") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`Unable to summon ^3${foundPlayer.GetName} ^0to your location!`, SystemTypes.Error));
                }
              }));
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
          //   await player.Notify("Staff Menu", "You can't summon yourself!", NotificationTypes.Error);
          // }
        }
      }
    }
  }
  
  private async EVENT_returnSummonedPlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.getSummonReturned, foundPlayer.Handle, {player: Object.assign({}, player), playerPos: player.Position}, async (cbState, passedData) => {
                if (cbState == "SUCCESS") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've returned ^3${foundPlayer.GetName}^0 to their original position.`, SystemTypes.Admin));

                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Returned__",
                      description: `A player has been returned to their original location.\n\n**Username**: ${foundPlayer.GetName}\n**Rank**: ${Ranks[foundPlayer.Rank]}\n**Returned By**: ${foundPlayer.GetName}\n**Returners Rank**: ${Ranks[foundPlayer.Rank]}\n**Returners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else if (cbState == "ERROR_TPING") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("Unable to teleport them to their previous location!", SystemTypes.Error));
                } else if (cbState == "NO_SUMMON_LAST_LOCATION") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("This player hasn't been summoned!", SystemTypes.Error));
                }
              }));
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
          //   await player.Notify("Staff Menu", "You can't return yourself!", NotificationTypes.Error);
          // }
        }
      }
    }
  }

  private async EVENT_spectatePlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);

        if (havePerm) {
          if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              console.log("ply stuff", player.Position, foundPlayer.Position);
              this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.spectatePlayer, player.Handle, {player: Object.assign({}, foundPlayer), playerPos: foundPlayer.Position}, async (cbState, passedData) => {
                if (cbState == "STARTED") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've started spectating ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));
                  
                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Spectating__",
                      description: `A player has started spectating another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Spectated Player**: ${foundPlayer.GetName}\n**Spectatees Rank**: ${Ranks[foundPlayer.Rank]}\n**Returners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else if (cbState == "STOPPED") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've stopped spectating ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));
                  
                  const playersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Spectating__",
                      description: `A player has stopped spectating another player.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Spectated Player**: ${foundPlayer.GetName}\n**Spectatees Rank**: ${Ranks[foundPlayer.Rank]}\n**Returners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else if (cbState == "ERROR_TPING") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`Unable to spectate ^3${foundPlayer.GetName} ^0!`, SystemTypes.Error));
                }
              }));

              await player.TriggerEvent(Events.startSpectating, Object.assign({}, foundPlayer), foundPlayer.Position);
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Staff Menu", "You can't spectate yourself!", NotificationTypes.Error);
          }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  // Events [Server Management]
  private async EVENT_changeWeather(newWeather: string): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Rank >= Ranks.Admin) {
        emitNet(Events.sendSystemMessage, -1, new Message(`A server administrator has changed the weather to ${newWeather}.`, SystemTypes.Announcement));
        await this.server.weatherManager.setWeather(newWeather.toUpperCase(), true, player);
      }
    }
  }

  private async EVENT_changeTime(newHour: number, newMinute: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      const havePerm = this.havePermission(player.Rank);

      if (havePerm) {
        emitNet(Events.sendSystemMessage, -1, new Message(`A server administrator has changed the time to ${addZero(newHour)}:${addZero(newMinute)}.`, SystemTypes.Announcement));
        await this.server.timeManager.changeTime(newHour, newMinute, false, player);
      }
    }
  }

  // Events [Player Actions]
  private async EVENT_bringAll(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      const havePerm = this.havePermission(player.Rank);
      console.log("have permission!", havePerm);

      if (havePerm) {
        const myPos = player.Position;
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;

        for (let i = 0; i < svPlayers.length; i++) {
          if (svPlayers[i].Handle !== player.Handle) {
            const ped = GetPlayerPed(svPlayers[i].Handle);
            console.log("players ped!", ped);
            if (ped > 0) {
              SetEntityCoords(ped, myPos.x, myPos.y, myPos.z, false, false, false, false);
              await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`You've been brought to ${player.GetName}.`, SystemTypes.Admin));
            } else {
              console.log(`Can't find players (${svPlayers[i].Id} | ${svPlayers[i].Handle}) ped!`);
            }
          } else {
            console.log("can't bring yourself!");
          }
        }

        const playersDiscord = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Staff Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__All Players Brought__",
            description: `A player has brought all server players to them.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Returners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }
    }
  }

  private async EVENT_freezeAll(): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      const havePerm = this.havePermission(player.Rank);
      console.log("have permission!", havePerm);

      if (havePerm) {
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;

        for (let i = 0; i < svPlayers.length; i++) {
          if (svPlayers[i].Handle !== player.Handle) {
            const ped = GetPlayerPed(svPlayers[i].Handle);
            const states = Player(svPlayers[i].Handle);

            if (ped > 0) {
              states.state.frozen = !states.state.frozen;
              FreezeEntityPosition(ped, states.state.frozen);
                
              const currVeh = GetVehiclePedIsIn(ped, false);
              if (GetVehiclePedIsIn(ped, false) > 0) {
                FreezeEntityPosition(currVeh, states.state.frozen);
              }

              states.state.frozen ?
              await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`You've been frozen by ${player.GetName}.`, SystemTypes.Admin)) :
              await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`You've been unfrozen by ${player.GetName}.`, SystemTypes.Admin));
            } else {
              console.log(`Can't find players (${svPlayers[i].Id} | ${svPlayers[i].Handle}) ped!`);
            }
          } else {
            console.log("can't bring yourself!");
          }
        }
        
        const playersDiscord = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Staff Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__All Players Frozen/Unfrozen__",
            description: `A player has frozen/unfrozen all server players to them.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Returners Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }
    }
  }

  // Callbacks
  private async CALLBACK_updatePlayerJob(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const character = await this.server.characterManager.Get(player);
        if (character) {

          const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(data.unitsNet);
          if (foundPlayer) {
            if (foundPlayer.Spawned) {
              const foundCharacter = await this.server.characterManager.Get(foundPlayer);
              if (foundCharacter) {
                // Sets their job (Controls what dept rank is FTO/High Command)

                if (data.jobName !== Jobs.Community && data.jobName !== Jobs.Civilian) {
                  const highCommand = this.server.jobManager.highCommand(data.jobName, data.jobRank);
                  const callsign = foundCharacter.Job.Callsign !== undefined ? foundCharacter.Job.Callsign : sharedConfig.jobs.defaultCallsign;
                  const updatedJob = await foundCharacter.updateJob(data.jobName, data.jobLabel, data.jobRank, highCommand, callsign, false);

                  if (updatedJob !== undefined) {
                    // Set your selected character fuck thing
                    foundPlayer.selectedCharacter = { // Update selected character to have new job
                      id: foundCharacter.Id,
                      firstName: foundCharacter.firstName,
                      lastName: foundCharacter.lastName,
                      nationality: foundCharacter.nationality,
                      backstory: foundCharacter.backstory,
                      dob: foundCharacter.DOB,
                      age: foundCharacter.Age,
                      isFemale: foundCharacter.Female,
                      phone: foundCharacter.Phone,
                      job: foundCharacter.Job,
                      metadata: foundCharacter.Metadata,
                      createdAt: foundCharacter.CreatedAt,
                      lastUpdated: foundCharacter.LastEdited,
                    };

                    // Empty owned characters table
                    foundPlayer.characters = [];

                    // Sync all players & selected characters to all clients
                    emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

                    // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
                    this.server.commandManager.createChatSuggestions(foundPlayer);
                    await foundPlayer.TriggerEvent(Events.updateSuggestions);

                    await foundPlayer.TriggerEvent(Events.updateCharacter, Object.assign({}, foundCharacter)); // Update our character on our client (char info, job, etc)
                    await foundPlayer.Notify("Character", `${player.GetName} has set your job to [${data.jobLabel}] - ${data.jobRankLabel}.`, NotificationTypes.Info);
                  }

                  await player.TriggerEvent(Events.receiveServerCB, updatedJob, data); // Returns true or false, if it sucessfully updated players job (fired them)

                  const updatersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Job Updated__",
                      description: `A player has had his job updated.\n\n**Username**: ${foundPlayer.GetName}\n**Character Name**: ${foundCharacter.Name}\n**New Job**: ${JSON.stringify(foundCharacter.Job, null, 4)}\n**Updated By**: ${player.GetName}\n**Updaters Rank**: ${Ranks[player.Rank]}\n**Updaters Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                } else {
                  const updatedJob = await foundCharacter.updateJob(data.jobName, data.jobLabel);

                  if (updatedJob !== undefined) {
                    // Set your selected character fuck thing
                    foundPlayer.selectedCharacter = { // Update selected character to have new job
                      id: foundCharacter.Id,
                      firstName: foundCharacter.firstName,
                      lastName: foundCharacter.lastName,
                      nationality: foundCharacter.nationality,
                      backstory: foundCharacter.backstory,
                      dob: foundCharacter.DOB,
                      age: foundCharacter.Age,
                      isFemale: foundCharacter.Female,
                      phone: foundCharacter.Phone,
                      job: foundCharacter.Job,
                      metadata: foundCharacter.Metadata,
                      createdAt: foundCharacter.CreatedAt,
                      lastUpdated: foundCharacter.LastEdited,
                    };

                    // Empty owned characters table
                    foundPlayer.characters = [];

                    // Sync all players & selected characters to all clients
                    emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.GetPlayers));

                    // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
                    this.server.commandManager.createChatSuggestions(foundPlayer);
                    await foundPlayer.TriggerEvent(Events.updateSuggestions);

                    await foundPlayer.TriggerEvent(Events.updateCharacter, Object.assign({}, foundCharacter)); // Update our character on our client (char info, job, etc)
                    await foundPlayer.Notify("Character", `${player.GetName} has set your job to ${data.jobLabel}.`, NotificationTypes.Info);
                  }

                  await player.TriggerEvent(Events.receiveServerCB, updatedJob, data); // Returns true or false, if it sucessfully updated players job (fired them)

                  const updatersDiscord = await player.GetIdentifier("discord");
                  await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                    username: "Staff Logs", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Job Updated__",
                      description: `A player has had his job updated.\n\n**Username**: ${foundPlayer.GetName}\n**Character Name**: ${foundCharacter.Name}\n**New Job**: ${JSON.stringify(foundCharacter.Job, null, 4)}\n**Updated By**: ${player.GetName}\n**Updaters Rank**: ${Ranks[player.Rank]}\n**Updaters Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                }
              } else {
                await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
              }
            } else {
              await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
            }
          } else {
            await player.TriggerEvent(Events.receiveServerCB, false, data); // Returns true or false, if it sucessfully updated players job (fired them)
          }
        }
      }
    }
  }

  public async EVENT_logAdminAction(logType: AdminActions, data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        if (player.Rank >= Ranks.Admin) {
          const updatersDiscord = await player.GetIdentifier("discord");

          switch (logType) {
            case AdminActions.Godmode:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Godmode Enabled__",
                    description: `A player has enabled godmode.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Godmode Disabled__",
                    description: `A player has disabled godmode.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;
              
            case AdminActions.PlayerBlips:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Player Blips Enabled__",
                    description: `A player has enabled player blips.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Player Blips Disabled__",
                    description: `A player has disabled player blips.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;
              
            case AdminActions.PlayerBlips:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Player Blips Enabled__",
                    description: `A player has enabled player blips.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Player Blips Disabled__",
                    description: `A player has disabled player blips.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;
              
            case AdminActions.Invisible:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Invisibility Enabled__",
                    description: `A player has enabled invisibility.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Invisibility Disabled__",
                    description: `A player has disabled invisibility.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.TPM:
              if (data.crossing.length > 0) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Teleported To Marker__",
                    description: `A player has teleported to their marker.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Coords**: ${JSON.stringify(data.position, null, 4)}\n**Street**: ${data.street} / ${data.crossing}\n**Zone**: ${data.zone}\n**Postal**: ${data.postal}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Teleported To Marker__",
                    description: `A player has teleported to their marker.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Coords**: ${JSON.stringify(data.position, null, 4)}\n**Street**: ${data.street}\n**Zone**: ${data.zone}\n**Postal**: ${data.postal}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.GoBack:

              if (data.crossing.length > 0) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Gone To Previous Location__",
                    description: `A player has gone back to their previous location.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Coords**: ${JSON.stringify(data.position, null, 4)}\n**Street**: ${data.street} / ${data.crossing}\n**Zone**: ${data.zone}\n**Postal**: ${data.postal}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Gone To Previous Location__",
                    description: `A player has gone back to their previous location.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Coords**: ${JSON.stringify(data.position, null, 4)}\n**Street**: ${data.street}\n**Zone**: ${data.zone}\n**Postal**: ${data.postal}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.RepairedVehicle:
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Vehicle Repaired__",
                  description: `A player has repaired their vehicle.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              break;

            case AdminActions.RepairedVehicle:
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Vehicle Repaired__",
                  description: `A player has repaired their vehicle.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              break;

            case AdminActions.GiveWeapon:
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Gave Weapon__",
                  description: `A player has gave themselves a weapon.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Weapon**: ${data.weapon}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              break;

            case AdminActions.GiveAllWeapons:
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Green,
                  title: "__Gave All Weapons__",
                  description: `A player has gave themselves all weapons.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              break;

            case AdminActions.RemoveAllWeapons:
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                username: "Staff Logs", embeds: [{
                  color: EmbedColours.Red,
                  title: "__Removed All Weapons__",
                  description: `A player has removed all their weapons.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                  footer: {
                    text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                    icon_url: sharedConfig.serverLogo
                  }
                }]
              }));

              break;

            case AdminActions.InfiniteAmmo:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Infinite Ammo Enabled__",
                    description: `A player has enabled infinite ammo.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Infinite Ammo Disabled__",
                    description: `A player has disabled infinite ammo.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.NoReload:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__No Reload Enabled__",
                    description: `A player has enabled no reload.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__No Reload Disabled__",
                    description: `A player has disabled no reload.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.NoRecoil:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__No Recoil Enabled__",
                    description: `A player has enabled no recoil.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__No Recoil Disabled__",
                    description: `A player has disabled no recoil.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;

            case AdminActions.GravityGun:
              if (data.toggled) {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Green,
                    title: "__Gravity Gun Added__",
                    description: `A player has gave themselves the Gravity Gun.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              } else {
                await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
                  username: "Staff Logs", embeds: [{
                    color: EmbedColours.Red,
                    title: "__Gravity Gun Removed__",
                    description: `A player has removed the Gravity Gun from themselves.\n\n**Username**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${updatersDiscord != "Unknown" ? `<@${updatersDiscord}>` : updatersDiscord}`,
                    footer: {
                      text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                      icon_url: sharedConfig.serverLogo
                    }
                  }]
                }));
              }

              break;
          }
        }
      }
    }
  }
}
