import { Server } from "../../server";
import { addZero } from "../../utils";

import { Kick } from "../../models/database/kick";
import { Warning } from "../../models/database/warning";
import { Commend } from "../../models/database/commend";
import { Ban } from "../../models/database/ban";
import { ClientCallback } from "../../models/clientCallback";

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Callbacks } from "../../../shared/enums/events/callbacks";

export class StaffMenu {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events

    // [Connected Players]
    onNet(Events.banPlayer, this.EVENT_banPlayer.bind(this));
    onNet(Events.kickPlayer, this.EVENT_kickPlayer.bind(this));
    onNet(Events.warnPlayer, this.EVENT_warnPlayer.bind(this));
    onNet(Events.commendPlayer, this.EVENT_commendPlayer.bind(this));
    onNet(Events.freezePlayer, this.EVENT_freezePlayer.bind(this));
    onNet(Events.tpToPlayer, this.EVENT_tpToPlayer.bind(this));
    onNet(Events.tpToVehicle, this.EVENT_tpToVehicle.bind(this));
    onNet(Events.summonPlayer, this.EVENT_summonPlayer.bind(this));
    onNet(Events.returnSummonedPlayer, this.EVENT_returnSummonedPlayer.bind(this));
    onNet(Events.spectatePlayer, this.EVENT_spectatePlayer.bind(this));

    // [Server Management]
    onNet(Events.changeWeather, this.EVENT_changeWeather.bind(this));
    onNet(Events.changeTime, this.EVENT_changeTime.bind(this));
    onNet(Events.bringAll, this.EVENT_bringAll.bind(this));
    onNet(Events.freezeAll, this.EVENT_freezeAll.bind(this));

    // [Player Actions]
    // onNet(Events.toggleBlips, this.EVENT_toggleBlips.bind(this));
  }

  // Methods
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
              if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  if (foundPlayer.Rank < player.Rank) {
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
                  } else {
                    await player.Notify("Ban", "You can't ban someone who has a higher rank than you!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Ban", "Player not found!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Ban", "You can't ban yourself!", NotificationTypes.Error);
              }
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
              if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  if (foundPlayer.Rank < player.Rank) {
                    const kick = new Kick(foundPlayer.Id, kickReason, player.Id);
                    kick.Kicker = player;
  
                    const saved = await kick.save();
                    if (saved) {
                      kick.drop();
                      await player.Notify("Kick", `You've kicked ${foundPlayer.GetName}, for ${kickReason}.`, NotificationTypes.Info, 5000);
                    }
                  } else {
                    await player.Notify("Kick", "You can't kick someone who has a higher rank than you!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Kick", "Player not found!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Kick", "You can't kick yourself!", NotificationTypes.Error);
              }
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
              if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  if (foundPlayer.Rank < player.Rank) {
                    const warning = new Warning(foundPlayer.Id, warnReason, player.Id);
                    warning.Warner = player;
                    
                    const saved = await warning.save();
                    if (saved) {
                      await warning.send();
                      await player.Notify("Warn", `You've warned ${foundPlayer.GetName}, for ${warnReason}.`, NotificationTypes.Info, 5000);
                    }
                  } else {
                    await player.Notify("Warn", "You can't warn someone who has a higher rank than you!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Warn", "Player not found!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Warn", "You can't warn yourself!", NotificationTypes.Error);
              }
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
              if (player.Id !== playerId) {
                const foundPlayer = await this.server.playerManager.getPlayerFromId(playerId);

                if (foundPlayer) {
                  const commend = new Commend(foundPlayer.Id, commendReason, player.Id);
                  const saved = await commend.save();
                  if (saved) {
                    await player.Notify("Commend", `You've commended ${foundPlayer.GetName}, for ${commendReason}.`, NotificationTypes.Info, 5000);
                  }
                } else {
                  await player.Notify("Commend", "Player not found!", NotificationTypes.Error);
                }
              } else {
                await player.Notify("Commend", "You can't commend yourself!", NotificationTypes.Error);
              }
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

  private async EVENT_freezePlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          if (player.Id !== playerId) {
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
                } else {
                  await foundPlayer.TriggerEvent(Events.sendSystemMessage, new Message(`You've been unfrozen by ${player.GetName}.`, SystemTypes.Admin));
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've unfrozen ${foundPlayer.GetName}.`, SystemTypes.Admin));
                }
              }
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Staff Menu", "You can't freeze yourself!", NotificationTypes.Error);
          }
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
          if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              await player.TriggerEvent(Events.goToPlayer, Object.assign({}, foundPlayer), foundPlayer.Position);
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Staff Menu", "You can't teleport to yourself!", NotificationTypes.Error);
          }
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
        console.log("have permission!", havePerm);

        if (havePerm) {
          if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              const ped = GetPlayerPed(foundPlayer.Handle);

              if (ped > 0) {
                const currVeh = GetVehiclePedIsIn(ped, false)

                if (currVeh != 0) {
                  const myPed = GetPlayerPed(player.Handle);
                  SetPedIntoVehicle(myPed, currVeh, 0); // See if this places u into other seats, if that seat is full
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
    } else {
      console.log("player id doesn't exist!");
    }
  }
  
  private async EVENT_summonPlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.getSummoned, foundPlayer.Handle, {player: Object.assign({}, player), playerPos: player.Position}, async (cbState, passedData) => {
                if (cbState == "SUCCESS") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've summoned ^3${foundPlayer.GetName}^0.`, SystemTypes.Admin));
                } else if (cbState == "ERROR_TPING") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`Unable to summon ^3${foundPlayer.GetName} ^0to your location!`, SystemTypes.Error));
                }
              }));
            } else {
              await player.Notify("Staff Menu", "Player not found!", NotificationTypes.Error);
            }
          // } else {
            // await player.Notify("Staff Menu", "You can't teleport to yourself!", NotificationTypes.Error);
          // }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }
  
  private async EVENT_returnSummonedPlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          // if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
              this.server.clientCallbackManager.Add(new ClientCallback(Callbacks.getSummonReturned, foundPlayer.Handle, {player: Object.assign({}, player), playerPos: player.Position}, async (cbState, passedData) => {
                if (cbState == "SUCCESS") {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You've returned ^3${foundPlayer.GetName}^0 to their original position.`, SystemTypes.Admin));
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
            // await player.Notify("Staff Menu", "You can't teleport to yourself!", NotificationTypes.Error);
          // }
        }
      }
    } else {
      console.log("player id doesn't exist!");
    }
  }

  private async EVENT_spectatePlayer(playerId: number): Promise<void> {
    if (playerId > 0) {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        const havePerm = this.havePermission(player.Rank);
        console.log("have permission!", havePerm);

        if (havePerm) {
          if (player.Id !== playerId) {
            const foundPlayer = await this.server.connectedPlayerManager.GetPlayerFromId(playerId);

            if (foundPlayer) {
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
      console.log("have permission!", havePerm);

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
      }
    }
  }

  private async EVENT_toggleBlips(toggledState: boolean): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Rank >= Ranks.Admin) {
        const states = Player(player.Handle);
        states.state.playerBlips = toggledState;
        console.log("states", states.state.playerBlips);
    
        if (states.state.playerBlips) {
          console.log("Enable player blips!");
        } else {
          console.log("Disable player blips!");
        }
      }
    }
  }
}
