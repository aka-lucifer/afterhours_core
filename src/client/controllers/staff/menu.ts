import { Audio, Blip, BlipSprite, Game, Ped, Scaleform, Vector3, Vehicle, World } from "fivem-js";

import { Client } from "../../client";
import { teleportToCoords, NumToVector3, Delay, keyboardInput, Inform, sortWeapons, getLocation, getZone } from "../../utils";

import { Menu } from "../../models/ui/menu/menu";
import { Submenu } from "../../models/ui/menu/submenu";
import { Notification } from "../../models/ui/notification";
import { svPlayer } from "../../models/player";
import { ServerCallback } from '../../models/serverCallback';

import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { Events } from "../../../shared/enums/events/events";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { AddonWeapons, Weapons } from '../../../shared/enums/weapons';
import { Ranks } from "../../../shared/enums/ranks";
import { Weathers, WinterWeathers } from "../../../shared/enums/sync/weather";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { JobCallbacks } from '../../../shared/enums/events/jobs/jobCallbacks';
import { formatSplitCapitalString, splitCapitalsString } from "../../../shared/utils";
import { JobLabels, Jobs } from "../../../shared/enums/jobs/jobs";
import { CountyRanks, PoliceRanks, StateRanks } from "../../../shared/enums/jobs/ranks";
import { AdminActions } from "../../../shared/enums/adminActions";

import sharedConfig from "../../../configs/shared.json";

interface PlayerMenu {
  netId: number,
  menu: Submenu
}

const banTypes = [
  "Seconds",
  "Minutes",
  "Hours",
  "Days",
  "Weeks",
  "Months",
  "Years"
]

interface ConnectedPlayer {
  netId: string;
  coords: Vector3;
  heading: number;
  name: string,
  rank: Ranks,
  inVeh: boolean;
  vehType?: string
}

interface PlayerBlip {
  netId: number;
  blip: Blip;
}

export class StaffMenu {
  private client: Client;

  // Menus
  private menu: Menu;
  
  // Menus [Connected Players]
  private playersMenu: Submenu;
  private playerMenus: PlayerMenu[] = [];
  private warningScaleform: Scaleform;
  private warningTick: number = undefined;

  // Ban Data
  private banReason: string;
  private banLength: number;
  private banLengthType: string;
  private banPermanent: boolean = false;

  // Kick Data
  private kickReason: string;

  // Spectate Data
  private spectatingPlayer: boolean = false;
  private spectateLastPos: Vector3 = undefined;

  // Menus [Server Management]
  private serverMenu: Submenu;
  private weatherMenu: Submenu;
  private timeMenu: Submenu;

  // Menus [Actions]
  private playerActionsMenu: Submenu;
  private vehicleActionsMenu: Submenu;
  private weaponActionsMenu: Submenu;

  // Menu Components

  // [Server] Data
  private weatherTypes: string[] = [];
  private weather: string;
  
  private timeHours: number[] = [];
  private timeMinutes: number[] = [];
  private hour: number = 0;
  private minute: number = 0;

  // [Player] Data
  private godmode: boolean = false;
  private godmodeTick: number = undefined;

  private visible: boolean = true;
  private onDuty: boolean = false;

  private lastLocation: Vector3;
  private summonLastLocation: Vector3;

  private playersBlips: boolean = false;
  private createdBlips: PlayerBlip[] = [];

  // [Weapon] Data
  private noReload: boolean = false;
  private infiniteAmmo: boolean = false;
  private noRecoil: boolean = false;
  private usingGravityGun: boolean = false;

  // Ticks
  private weaponTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    if (this.client.player.Rank >= Ranks.Admin) {

      // Events
      onNet(Events.teleportToMarker, this.EVENT_tpm.bind(this));
      onNet(Events.teleportBack, this.EVENT_teleportBack.bind(this));
      onNet(Events.updatePlayerBlips, this.EVENT_updatePlayerBlips.bind(this));
      onNet(Events.deleteLeftPlayer, this.EVENT_deleteLeftPlayer.bind(this));
      onNet(Events.receiveWarning, this.EVENT_receiveWarning.bind(this));
      onNet(Events.goToPlayer, this.EVENT_goToPlayer.bind(this));
      
      // Callbacks
      onNet(Callbacks.getVehicleFreeSeat, this.CALLBACK_getVehicleFreeSeat.bind(this));
      onNet(Callbacks.spectatePlayer, this.CALLBACK_spectatePlayer.bind(this));
      onNet(Callbacks.getSummoned, this.CALLBACK_getSummoned.bind(this));
      onNet(Callbacks.getSummonReturned, this.CALLBACK_getSummonReturned.bind(this));

      // Key Mapped Commands
      RegisterCommand("+toggle_menu", this.toggleMenu.bind(this), false);

      Inform("Staff | Menu Controller", "Started!");
    }
  }

  // Getters & Setters
  public get WeaponActive(): boolean {
    return this.weaponTick !== undefined;
  }

  public get NoRecoil(): boolean {
    return this.noRecoil;
  }

  public get Duty(): boolean {
    return this.onDuty;
  }

  public set Duty(newState: boolean) {
    this.onDuty = newState;
  }

  // Methods
  private getWeatherTypes(): void {
    const weathers = Object.keys(Weathers);
    const winterWeathers = Object.keys(WinterWeathers);

    for (let i = 0; i < weathers.length; i++) {
      this.weatherTypes.push(weathers[i]);
    }
    
    for (let i = 0; i < winterWeathers.length; i++) {
      this.weatherTypes.push(winterWeathers[i]);
    }
  }

  private getTimes(): void {
    for (let i = 0; i < 24; i++) {
      this.timeHours.push(i);
    }
    
    for (let i = 0; i < 60; i++) {
      this.timeMinutes.push(i);
    }
  }

  private havePermission(): boolean {
    let havePermission = this.client.player.Rank >= Ranks.Admin;

    if (!this.client.Developing) { // If this server is the development server
      if (this.client.player.Rank == Ranks.Developer) havePermission = false; // Check if we're a dev, if we are, disable banning on public server
    }

    return havePermission;
  }

  public init(): void {
    // Get Menu Data
    this.getWeatherTypes();
    this.getTimes();

    this.menu = new Menu("Staff Menu", GetCurrentResourceName(), MenuPositions.MiddleRight);

    // Connected Players
    this.playersMenu = this.menu.BindSubmenu("Connected Players");

    // Server Management
    this.serverMenu = this.menu.BindSubmenu("Server Management");
    
    this.weatherMenu = this.serverMenu.BindSubmenu("Weather");
    this.weatherMenu.BindList("Weather", this.weatherTypes, (newWeather: string) => {
      this.weather = newWeather;
    });

    this.weatherMenu.BindButton("Set Weather", () => {
      if (this.weather !== undefined) {
        emitNet(Events.changeWeather, this.weather);
      }
    });
    
    this.timeMenu = this.serverMenu.BindSubmenu("Time");
    this.timeMenu.BindList("Hour", this.timeHours, (newHour: number) => {
      this.hour = newHour;
    });

    this.timeMenu.BindList("Minute", this.timeMinutes, (newMinute: number) => {
      this.minute = newMinute;
    });

    this.timeMenu.BindButton("Set Time", () => {
      emitNet(Events.changeTime, this.hour, this.minute);
    });

    this.serverMenu.BindButton("Bring All", () => {
      emitNet(Events.bringAll);
    });

    this.serverMenu.BindButton("Freeze All", () => {
      emitNet(Events.freezeAll);
    });

    // Player Actions Menu
    this.playerActionsMenu = this.menu.BindSubmenu("Player Actions");

    if (this.client.player.Rank >= Ranks.Admin) {
      this.playerActionsMenu.BindCheckbox("Godmode", this.godmode, (newState: boolean) => {
        this.godmode = newState;
        this.toggleGodmode(this.godmode);
      });

      this.playerActionsMenu.BindCheckbox("NoClip", this.client.staffManager.noclip.Active, () => {
        this.client.staffManager.noclip.toggleNoclip();
      });

      this.playerActionsMenu.BindCheckbox("Player Blips", this.playersBlips, async(newState: boolean) => {
        this.playersBlips = newState;

        if (this.playersBlips) {
          const notify = new Notification("Staff Menu", "Player blips enabled", NotificationTypes.Info);
          await notify.send();
        } else {
          const notify = new Notification("Staff Menu", "Player blips disabled!", NotificationTypes.Error);
          await notify.send();
        }

        emitNet(Events.logAdminAction, AdminActions.PlayerBlips, {
          toggled: this.playersBlips
        });
      });

      this.playerActionsMenu.BindCheckbox("Invisible", !this.visible, (newState: boolean) => {
        this.visible = !newState;

        const myPed = Game.PlayerPed;
        myPed.IsVisible = this.visible;

        emitNet(Events.logAdminAction, AdminActions.Invisible, {
          toggled: !this.visible
        });
      });

      this.playerActionsMenu.BindCheckbox("On Duty", this.onDuty, (newState: boolean) => {
        this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.setDuty, {state: newState}, async(cbData, passedData) => {
          if (cbData) {
            this.client.Character.Job.status = newState;
          }
        }));
      });

      this.playerActionsMenu.BindButton("Teleport To Marker", async() => {
        await this.EVENT_tpm();
      });

      this.playerActionsMenu.BindButton("Go To Previous Location", async() => {
        await this.EVENT_teleportBack();
      });
    }

    this.weaponActionsMenu = this.menu.BindSubmenu("Weapon Actions");
      
    this.weaponActionsMenu.BindButton("Give Weapon", async() => {
      const weaponName = await keyboardInput("Weapon Name", 25);
      if (weaponName !== undefined && weaponName !== null) {
        if (weaponName.length > 0) {
          const weapons = await sortWeapons(sharedConfig.weapons); // Sort the weapons array, so it's just weapon data and no hash
          const weaponIndex = weapons.findIndex(weapon => weapon.name == weaponName);

          if (weaponIndex !== -1) {
            const hash = GetHashKey(weaponName);
            const [boolTing, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, hash);
            Game.PlayerPed.giveWeapon(hash, maxAmmo, false, true);

            emitNet(Events.logAdminAction, AdminActions.GiveWeapon, {
              weapon: weapons[weaponIndex].label
            });

            const notify = new Notification("Staff Menu", `You've gave yourself an ${weapons[weaponIndex].label}.`, NotificationTypes.Info);
            await notify.send();
          } else {
            const notify = new Notification("Staff Menu", `Weapon name not found or is incorrect!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff Menu", `You haven't entered a weapon!`, NotificationTypes.Error);
          await notify.send();
        }
      } else {
        const notify = new Notification("Job", `You haven't entered a weapon!`, NotificationTypes.Error);
        await notify.send();
      }
    });

    this.weaponActionsMenu.BindButton("Give All Weapons", async() => {
      const weapons = await sortWeapons(sharedConfig.weapons); // Sort the weapons array, so it's just weapon data and no hash
      for (let i = 0; i < weapons.length; i++) {
        if (weapons[i].type == "weapon") {
          const hash = GetHashKey(weapons[i].name);
          const [boolTing, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, hash);
          Game.PlayerPed.giveWeapon(hash, maxAmmo, false, false);
        }

        if (i == (weapons.length - 1)) {
          emitNet(Events.logAdminAction, AdminActions.GiveAllWeapons);

          const notify = new Notification("Staff Menu", "All weapons added.", NotificationTypes.Info);
          await notify.send();
        }
      }
    });

    this.weaponActionsMenu.BindButton("Remove All Weapons", async() => {
      Game.PlayerPed.removeAllWeapons();
      emitNet(Events.logAdminAction, AdminActions.RemoveAllWeapons);

      const notify = new Notification("Staff Menu", "All weapons removed!", NotificationTypes.Error);
      await notify.send();
    });

    this.weaponActionsMenu.BindCheckbox("Infinite Ammo", this.infiniteAmmo, (newState: boolean) => {
      this.infiniteAmmo = newState;
      SetPedInfiniteAmmoClip(Game.PlayerPed.Handle, this.infiniteAmmo);

      emitNet(Events.logAdminAction, AdminActions.InfiniteAmmo, {
        toggled: this.infiniteAmmo
      });
    });

    this.weaponActionsMenu.BindCheckbox("No Reload", this.noReload, (newState: boolean) => {
      this.noReload = newState;

      emitNet(Events.logAdminAction, AdminActions.NoReload, {
        toggled: this.noReload
      });
    });

    this.weaponActionsMenu.BindCheckbox("No Recoil", this.noRecoil, (newState: boolean) => {
      this.noRecoil = newState;

      emitNet(Events.logAdminAction, AdminActions.NoRecoil, {
        toggled: this.noRecoil
      });
    });

    this.weaponActionsMenu.BindCheckbox("Gravity Gun", this.usingGravityGun, (newState: boolean) => {
      this.usingGravityGun = newState;

      if (this.usingGravityGun) {
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, AddonWeapons.GravityGun, false)) {
          Game.PlayerPed.giveWeapon(AddonWeapons.GravityGun, 9999, false, true);
        } else {
          SetCurrentPedWeapon(Game.PlayerPed.Handle, AddonWeapons.GravityGun, true);
        }
      } else {
        if (HasPedGotWeapon(Game.PlayerPed.Handle, AddonWeapons.GravityGun, false)) {
          Game.PlayerPed.removeWeapon(AddonWeapons.GravityGun);
        }

        SetCurrentPedWeapon(Game.PlayerPed.Handle, Weapons.Unarmed, true);
      }

      emitNet(Events.logAdminAction, AdminActions.GravityGun, {
        toggled: this.usingGravityGun
      });
    });

    // Vehicle Actions Menu
    this.vehicleActionsMenu = this.menu.BindSubmenu("Vehicle Actions");

    this.vehicleActionsMenu.BindButton("Repair Vehicle", async() => {
      const myPed = Game.PlayerPed;
      if (IsPedInAnyVehicle(myPed.Handle, false)) {
        const currVeh = myPed.CurrentVehicle;
        if (currVeh.Health < currVeh.MaxHealth) {
          currVeh.repair();
          global.exports["vehDeformation"].FixVehicleDeformation(currVeh.Handle); // Wait until the vehicle is repair, then fix the deformation
          currVeh.DirtLevel = 0.0;
          currVeh.IsEngineRunning = true;

          emitNet(Events.logAdminAction, AdminActions.RepairedVehicle);

          const notify = new Notification("Staff Menu", "Vehicle fixed!", NotificationTypes.Success);
          await notify.send();
        } else {
          const notify = new Notification("Staff Menu", "Your vehicle isn't damaged!", NotificationTypes.Error);
          await notify.send();
        }
      }
    });
  }

  public refreshPlayers(): void {
    if (this.playersMenu !== undefined) {
      this.client.menuManager.emptyMenu(this.playersMenu.handle);
      this.playerMenus = [];
    }

    for (let i = 0; i < this.client.Players.length; i++) {
      let menu: Submenu;
      const playerData = this.client.Players[i];

      if (playerData.Character !== undefined) {
        menu = this.playersMenu.BindSubmenu(`[${playerData.NetworkId}] ${playerData.Name} | ${playerData.character.firstName} ${playerData.character.lastName}`);
      } else {
        menu = this.playersMenu.BindSubmenu(`[${playerData.NetworkId}] ${playerData.Name}`);
      }

      // [Player Banning]
      const banMenu = menu.BindSubmenu("Ban");
      banMenu.BindButton("Reason", async() => {
        const banReason = await keyboardInput("Ban Reason", 250);
        if (banReason != null) {
          if (banReason.length > 0) {
            this.banReason = banReason;
          } else {
            const notify = new Notification("Staff", `You haven't entered a ban reason!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a ban reason!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      banMenu.BindList("Type", banTypes, (newType: string) => {
        this.banLengthType = newType;
      });

      banMenu.BindButton("Length", async() => {
        const banLength = await keyboardInput("Ban Length", 10);
        if (banLength != null) {
          if (banLength.length > 0) {
            this.banLength = parseInt(banLength);
          } else {
            const notify = new Notification("Staff", `You haven't entered a ban length!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a ban length!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      banMenu.BindCheckbox("Permanent", this.banPermanent, (newState: boolean) => {
        this.banPermanent = newState;
      });

      banMenu.BindButton("Ban", async() => {
        if (this.banReason != null) {
          if (this.banReason.length > 0) {
            if (!this.banPermanent) {
              if (!this.banLengthType !== undefined) {
                if (this.banLength !== undefined && this.banLength > 0) {
                  emitNet(Events.banPlayer, playerData.Id, this.banReason, this.banPermanent, this.banLengthType.toUpperCase(), this.banLength);

                  this.banReason = undefined;
                  this.banLengthType = undefined;
                  this.banLength = undefined;
                  this.banPermanent = false;
                } else {
                  const notify = new Notification("Staff", `You haven't entered a ban length!`, NotificationTypes.Error);
                  await notify.send();
                }
              } else {
                const notify = new Notification("Staff", `You haven't entered a ban length type!`, NotificationTypes.Error);
                await notify.send();
              }
            } else {
              emitNet(Events.banPlayer, playerData.Id, this.banReason, this.banPermanent);

              this.banReason = undefined;
              this.banLengthType = undefined;
              this.banLength = undefined;
              this.banPermanent = false;
            }
          } else {
            const notify = new Notification("Staff", `You haven't entered a ban reason!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a ban reason!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      menu.BindButton("Kick", async() => {
        const kickReason = await keyboardInput("Kick Reason", 250);
        if (kickReason != null) {
          if (kickReason.length > 0) {
            this.kickReason = kickReason;
            emitNet(Events.kickPlayer, playerData.Id, this.kickReason);
          } else {
            const notify = new Notification("Staff", `You haven't entered a kick reason!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a kick reason!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      menu.BindButton("Warn", async() => {
        const warnReason = await keyboardInput("Warn Reason", 250);
        if (warnReason != null) {
          if (warnReason.length > 0) {
            emitNet(Events.warnPlayer, playerData.Id, warnReason);
          } else {
            const notify = new Notification("Staff", `You haven't entered a commend reason!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a command reason!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      menu.BindButton("Commend", async() => {
        const commendReason = await keyboardInput("Commend Reason", 250);
        if (commendReason != null) {
          if (commendReason.length > 0) {
            emitNet(Events.commendPlayer, playerData.Id, commendReason);
          } else {
            const notify = new Notification("Staff", `You haven't entered a commend reason!`, NotificationTypes.Error);
            await notify.send();
          }
        } else {
          const notify = new Notification("Staff", `You haven't entered a command reason!`, NotificationTypes.Error);
          await notify.send();
        }
      });

      const rankMenu = menu.BindSubmenu("Update Rank");
      for (let b = 0; b < Object.keys(Ranks).length / 2; b++) {
        if (b < this.client.Player.Rank) { // If this rank is less than yours (you can't give someone a higher rank than you)
          const rankLabelSplit = splitCapitalsString(Ranks[b]);
          const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

          rankMenu.BindButton(formattedRankLabel, () => {
            emitNet(Events.updatePlayerRank, playerData.Id, b);
          })
        }
      }

      if (this.client.Player.Rank >= Ranks.SeniorAdmin) {
        const jobMenu = menu.BindSubmenu("Update Job");

        const jobs = Object.keys(Jobs);
        const jobLabels = Object.keys(JobLabels);

        for (let b = 0; b < jobs.length; b++) {
          const job = Jobs[jobs[b]]

          if (job == Jobs.Police) {
            const jobLabel = JobLabels[jobLabels[b]];
            const jobTypeMenu = jobMenu.BindSubmenu(jobLabel);
            const policeRanks = Object.keys(PoliceRanks);

            for (let c = 0; c < policeRanks.length / 2; c++) {
              const rankLabelSplit = splitCapitalsString(PoliceRanks[policeRanks[c]]);
              const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

              const updateJob = jobTypeMenu.BindButton(formattedRankLabel, () => {
                this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.updatePlayerJob, {
                  unitsNet: playerData.Id,
                  jobName: job,
                  jobLabel: jobLabel,
                  jobRank: c,
                  jobRankLabel: formattedRankLabel
                }, async (recruitedUnit, passedData) => {
                  if (recruitedUnit) {
                    const notify = new Notification("Unit Management", `Set ${playerData.Name}'s job to [${jobLabel}] - ${formattedRankLabel}.`, NotificationTypes.Info);
                    await notify.send();
                  } else {
                    const notify = new Notification("Unit Management", "Unsuccessful in changing players job!", NotificationTypes.Error);
                    await notify.send();
                  }
                }));
              });
            }
          } else if (job == Jobs.County) {
            const jobLabel = JobLabels[jobLabels[b]];
            const jobTypeMenu = jobMenu.BindSubmenu(jobLabel);
            const countyRanks = Object.keys(CountyRanks);

            for (let c = 0; c < countyRanks.length / 2; c++) {
              const rankLabelSplit = splitCapitalsString(CountyRanks[countyRanks[c]]);
              const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

              const updateJob = jobTypeMenu.BindButton(formattedRankLabel, () => {
                this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.updatePlayerJob, {
                  unitsNet: playerData.Id,
                  jobName: job,
                  jobLabel: jobLabel,
                  jobRank: c,
                  jobRankLabel: formattedRankLabel
                }, async (recruitedUnit, passedData) => {
                  if (recruitedUnit) {
                    const notify = new Notification("Unit Management", `Set ${playerData.Name}'s job to [${jobLabel}] - ${formattedRankLabel}.`, NotificationTypes.Info);
                    await notify.send();
                  } else {
                    const notify = new Notification("Unit Management", "Unsuccessful in changing players job!", NotificationTypes.Error);
                    await notify.send();
                  }
                }));
              });
            }
          } else if (job == Jobs.State) {
            const jobLabel = JobLabels[jobLabels[b]];
            const jobTypeMenu = jobMenu.BindSubmenu(jobLabel);
            const stateRanks = Object.keys(StateRanks);

            for (let c = 0; c < stateRanks.length / 2; c++) {
              const rankLabelSplit = splitCapitalsString(StateRanks[stateRanks[c]]);
              const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

              const updateJob = jobTypeMenu.BindButton(formattedRankLabel, () => {
                this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.updatePlayerJob, {
                  unitsNet: playerData.Id,
                  jobName: job,
                  jobLabel: jobLabel,
                  jobRank: c,
                  jobRankLabel: formattedRankLabel
                }, async (recruitedUnit, passedData) => {
                  if (recruitedUnit) {
                    const notify = new Notification("Unit Management", `Set ${playerData.Name}'s job to [${jobLabel}] - ${formattedRankLabel}.`, NotificationTypes.Info);
                    await notify.send();
                  } else {
                    const notify = new Notification("Unit Management", "Unsuccessful in changing players job!", NotificationTypes.Error);
                    await notify.send();
                  }
                }));
              });
            }
          } else if (job == Jobs.Community) {
            const jobLabel = JobLabels.Community;
            const updateJob = jobMenu.BindButton(jobLabel, () => {
              this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.updatePlayerJob, {
                unitsNet: playerData.Id,
                jobName: job,
                jobLabel: jobLabel
              }, async (recruitedUnit, passedData) => {
                if (recruitedUnit) {
                  const notify = new Notification("Unit Management", `Set ${playerData.Name}'s job to ${jobLabel}.`, NotificationTypes.Info);
                  await notify.send();
                } else {
                  const notify = new Notification("Unit Management", "Unsuccessful in changing players job!", NotificationTypes.Error);
                  await notify.send();
                }
              }));
            });
          } else if (job == Jobs.Civilian) {
            const jobLabel = JobLabels.Civilian;
            const updateJob = jobMenu.BindButton(jobLabel, () => {
              this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.updatePlayerJob, {
                unitsNet: playerData.Id,
                jobName: job,
                jobLabel: jobLabel
              }, async (recruitedUnit, passedData) => {
                if (recruitedUnit) {
                  const notify = new Notification("Unit Management", `Set ${playerData.Name}'s job to ${jobLabel}.`, NotificationTypes.Info);
                  await notify.send();
                } else {
                  const notify = new Notification("Unit Management", "Unsuccessful in changing players job!", NotificationTypes.Error);
                  await notify.send();
                }
              }));
            });
          }
        }
      }

      menu.BindButton("Freeze", () => {
        emitNet(Events.freezePlayer, playerData.Id);
      });

      menu.BindButton("Revive", () => {
        emitNet(Events.revivePlayer, playerData.Id);
      });

      menu.BindButton("Teleport To", () => {
        emitNet(Events.tpToPlayer, playerData.Id);
      });

      menu.BindButton("Teleport Inside Vehicle", () => {
        emitNet(Events.tpToVehicle, playerData.Id);
      });

      menu.BindButton("Summon", () => {
        emitNet(Events.summonPlayer, playerData.Id);
      });

      menu.BindButton("Return Player", () => {
        emitNet(Events.returnSummonedPlayer, playerData.Id);
      });

      menu.BindButton("Spectate", () => {
        emitNet(Events.spectatePlayer, playerData.Id);
      });

      this.playerMenus.push({
        netId: playerData.NetworkId,
        menu: menu
      });
    }
  }

  public startWeapon(): void {
    if (this.weaponTick === undefined) this.weaponTick = setTick(async() => {
      if (this.client.player.Rank >= Ranks.Admin) {
        const myPed = Game.PlayerPed;
        const currWeapon = GetSelectedPedWeapon(myPed.Handle);
        
        // [No Reload]
        if (this.noReload) {
          // Not unarmed
          if (currWeapon !== Weapons.Unarmed) {
            // Shoots bullets
            if (GetWeaponDamageType(currWeapon) === 3) {

              if (currWeapon !== Weapons.MiniGun && currWeapon !== Weapons.DoubleAction) {
                PedSkipNextReloading(myPed.Handle);
              }
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        } else {
          await Delay(500);
        }
      } else {
        await Delay(500);
      }
    });
  }

  public stopWeapon(): void {
    if (this.weaponTick !== undefined) {
      clearTick(this.weaponTick);
      this.weaponTick = undefined;
    }
  }

  private async toggleMenu(): Promise<void> {
    const havePerm = this.havePermission();

    if (havePerm) {
      if (!await this.client.menuManager.IsMenuOpen(this.menu.handle)) {
        this.refreshPlayers();
        await this.menu.Open();
      }
    }
  }

  public toggleGodmode(newState: boolean): void {
    console.log("set godmode to", newState);

    if (this.godmode) {
      if (this.godmodeTick === undefined) this.godmodeTick = setTick(() => {
        const myPed = Game.PlayerPed;
        myPed.IsInvincible = this.godmode;
        SetPlayerInvincible(Game.Player.Handle, this.godmode);

        myPed.CanRagdoll = false;
        myPed.clearBloodDamage();
        myPed.resetVisibleDamage();
        myPed.clearLastWeaponDamage();
        SetEntityProofs(myPed.Handle, true, true, true, true, true, true, true, true);
        myPed.IsOnlyDamagedByPlayer = false;
        SetEntityCanBeDamaged(myPed.Handle, false);
      });
    } else {
      if (this.godmodeTick !== undefined) {
        clearTick(this.godmodeTick);
        this.godmodeTick = undefined;

        const myPed = Game.PlayerPed;
        myPed.IsInvincible = false;
        SetPlayerInvincible(Game.Player.Handle, false);
        myPed.CanRagdoll = true;
        SetEntityProofs(myPed.Handle, false, false, false, false, false, false, false, false);
        myPed.IsOnlyDamagedByPlayer = true;
        SetEntityCanBeDamaged(myPed.Handle, true);
      }
    }

    emitNet(Events.logAdminAction, AdminActions.Godmode, {
      toggled: this.godmode
    });
  }

  // Events
  public async EVENT_tpm(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const myPed = Game.PlayerPed;

      if (!IsWaypointActive()) {
        const notify = new Notification("TPM", "You don't have a waypoint set!", NotificationTypes.Error);
        await notify.send();
        return
      }

      const waypointHandle = GetFirstBlipInfoId(8);

      if (DoesBlipExist(waypointHandle)) {
        this.lastLocation = myPed.Position;

        const waypointCoords = NumToVector3(GetBlipInfoIdCoord(waypointHandle));
        const teleported = await teleportToCoords(waypointCoords);
        if (teleported) {
          const [street, crossing, postal] = await getLocation(myPed);
          const zone = await getZone(myPed);

          emitNet(Events.logAdminAction, AdminActions.TPM, {
            position: waypointCoords,
            street: street,
            crossing: crossing,
            zone: zone,
            postal: postal.code
          });

          const notify = new Notification("Teleporter", "Teleported to waypoint", NotificationTypes.Success);
          await notify.send();
        }
      }
    }
  }

  private async EVENT_teleportBack(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (this.lastLocation !== undefined) {
        const teleported = await teleportToCoords(this.lastLocation);
        if (teleported) {
          const notify = new Notification("Teleporter", "Teleported to previous location", NotificationTypes.Success);
          await notify.send();

          const [street, crossing, postal] = await getLocation(Game.PlayerPed);
          const zone = await getZone(Game.PlayerPed);

          emitNet(Events.logAdminAction, AdminActions.GoBack, {
            position: this.lastLocation,
            street: street,
            crossing: crossing,
            zone: zone,
            postal: postal.code
          });

          this.lastLocation = undefined;
        }
      } else {
        const notify = new Notification("Teleporter", "You haven't teleported anywhere!", NotificationTypes.Error);
        await notify.send();
      }
    }
  }

  private async EVENT_updatePlayerBlips(units: ConnectedPlayer[]) {
    if (this.client.Player.Spawned && this.client.Player.Rank >= Ranks.Admin) {
      // console.log("passed players", units);
      
      if (this.playersBlips) {
        for (let i = 0; i < units.length; i++) {
          const netId = parseInt(units[i].netId);

          if (netId !== this.client.Player.NetworkId) {
            if (units[i].coords !== undefined) {
              const blipIndex = this.createdBlips.findIndex(blip => blip.netId == netId);

              if (blipIndex === -1) { // If the blip doesn't exist make it
                console.log("create blip on", units[i].netId);
                const blip = World.createBlip(new Vector3(units[i].coords.x, units[i].coords.y, units[i].coords.z));
                blip.IsShortRange = false;
                blip.Display = 2;

                if (units[i].inVeh) {
                  if (units[i].vehType == "automobile") {
                    blip.Sprite = BlipSprite.PersonalVehicleCar;
                  } else if (units[i].vehType == "bike") {
                    blip.Sprite = BlipSprite.PersonalVehicleBike;
                  } else if (units[i].vehType == "heli") {
                    blip.Sprite = BlipSprite.Helicopter;
                  } else if (units[i].vehType == "boat") {
                    blip.Sprite = BlipSprite.Boat;
                  }

                  blip.Name = `[${units[i].netId}] ${units[i].name} | ${Ranks[units[i].rank]}`;
                  blip.Rotation = units[i].heading;
                  blip.ShowHeadingIndicator = true;
                } else {
                  blip.Sprite = BlipSprite.Standard;
                  
                  blip.Name = `[${units[i].netId}] ${units[i].name} | ${Ranks[units[i].rank]}`;
                  blip.Rotation = units[i].heading;
                  blip.ShowHeadingIndicator = true;
                }

                this.createdBlips.push({
                  netId: netId,
                  blip: blip
                });
              } else { // If the blip exists, update it's properties
                const blipData = this.createdBlips[blipIndex];
                const foundBlip = new Blip(blipData.blip.Handle); // see if this fixes stupid bug

                console.log("blip 2");
                foundBlip.Position = units[i].coords;

                if (units[i].inVeh) {
                  if (units[i].vehType == "automobile") {
                    foundBlip.Sprite = BlipSprite.PersonalVehicleCar;
                  } else if (units[i].vehType == "bike") {
                    foundBlip.Sprite = BlipSprite.PersonalVehicleBike;
                  } else if (units[i].vehType == "heli") {
                    foundBlip.Sprite = BlipSprite.Helicopter;
                  } else if (units[i].vehType == "boat") {
                    foundBlip.Sprite = BlipSprite.Boat;
                  }

                  foundBlip.Name = `[${units[i].netId}] ${units[i].name} | ${Ranks[units[i].rank]}`;
                  foundBlip.Rotation = units[i].heading;
                  foundBlip.ShowHeadingIndicator = true;
                } else {
                  foundBlip.Sprite = BlipSprite.Standard;

                  foundBlip.Name = `[${units[i].netId}] ${units[i].name} | ${Ranks[units[i].rank]}`;
                  foundBlip.Rotation = units[i].heading;
                  foundBlip.ShowHeadingIndicator = true;
                }
              }
            }
          }
        }
      } else {
        if (this.createdBlips.length > 0) {
          for (let i = 0; i < this.createdBlips.length; i++) {
            const blip = new Blip(this.createdBlips[i].blip.Handle);
            blip.delete();
            this.createdBlips.splice(i, 1);
          }
        }
      }
    }
  }
  
  private EVENT_deleteLeftPlayer(netId: number): void { //
    const blipIndex = this.createdBlips.findIndex(blip => blip.netId == netId);
    console.log("blipindex from connected player!", netId, blipIndex);
    
    if (blipIndex !== -1) {
      console.log("delete connected player blip for ", netId, this.createdBlips[blipIndex], netId, " as they have left the server!");
      const blip = new Blip(this.createdBlips[blipIndex].blip.Handle);
      console.log("players blip", blip.Position);
      blip.delete();
      this.createdBlips[blipIndex].blip.delete();
      this.createdBlips.splice(blipIndex, 1);
      console.log("blips", this.createdBlips);
    }
  }

  private async EVENT_receiveWarning(warningReason: string): Promise<void> {
    this.warningScaleform = new Scaleform("MISSION_QUIT");
    const loadedScaleform = await this.warningScaleform.load();
    if (loadedScaleform) {
      this.warningScaleform.callFunction("SET_TEXT", "~r~Warning Received", `~w~You've received a warning for ~r~${warningReason}~w~!`);
      this.warningScaleform.callFunction("TRANSITION_IN", 0);
      this.warningScaleform.callFunction("TRANSITION_IN", 5500);

      Audio.playSoundFrontEnd("CHECKPOINT_PERFECT", "HUD_MINI_GAME_SOUNDSET");

      if (this.warningTick == undefined) this.warningTick = setTick(async() => {
        await this.warningScaleform.render2D();
      })

      await Delay(5500);

      if (this.warningTick != undefined) {
        clearTick(this.warningTick);
        this.warningTick = undefined;
      }
    }
  }

  private async EVENT_goToPlayer(player: svPlayer, playerPos: Vector3): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const foundPlayer = new svPlayer(player);
      if (foundPlayer) {
        this.lastLocation = Game.PlayerPed.Position;

        const teleported = await teleportToCoords(playerPos);
        if (teleported) {
          emit(Events.sendSystemMessage, new Message(`You've teleported to ^3${foundPlayer.Name}^0.`, SystemTypes.Admin));
        }
      }
    }
  }

  private CALLBACK_getVehicleFreeSeat(data: any): void {
    const vehicleHandle = NetworkGetEntityFromNetworkId(data.netId);

    if (vehicleHandle > 0) {
      const vehicle = new Vehicle(vehicleHandle);
      const maxSeats = GetVehicleMaxNumberOfPassengers(vehicle.Handle);
      let freeSeat = undefined;

      // Loop through all available seats and store them into our number array
      for (let i = 0; i < maxSeats; i++) {
        if (vehicle.isSeatFree(i)) {
          freeSeat = i;
        }
      }

      if (freeSeat !== undefined) {
        data.freeSeat = freeSeat;
        emitNet(Events.receiveClientCB, "SEATS_FREE", data);
      } else {
        emitNet(Events.receiveClientCB, "NO_SEATS_FOUND", data);
      }
    } else {
      emitNet(Events.receiveClientCB, "ERROR", data);
    }
  }

  private async CALLBACK_spectatePlayer(data: any): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const myPed = Game.PlayerPed;
      const player = new svPlayer(data.player);

      this.spectatingPlayer = !this.spectatingPlayer;

      if (this.spectatingPlayer) {
        this.spectateLastPos = myPed.Position;
        myPed.IsVisible = false;
        
        const teleported = await teleportToCoords(data.playerPos);
        if (teleported) {
          NetworkSetInSpectatorMode(true, player.Ped.Handle);
          emitNet(Events.receiveClientCB, "STARTED", data);
        } else {
          emitNet(Events.receiveClientCB, "ERROR_TPING", data);
        }
      } else {
        const teleported = await teleportToCoords(this.spectateLastPos);
        if (teleported) {
          myPed.IsVisible = true;
          NetworkSetInSpectatorMode(false, player.Ped.Handle);
          emitNet(Events.receiveClientCB, "STOPPED", data);
        } else {
          emitNet(Events.receiveClientCB, "ERROR_TPING", data);
        }
      }
    }
  }

  private async CALLBACK_getSummoned(data: any): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const foundPlayer = new svPlayer(data.player);
      if (foundPlayer) {
        this.summonLastLocation = Game.PlayerPed.Position;

        const teleported = await teleportToCoords(data.playerPos);
        if (teleported) {
          emit(Events.sendSystemMessage, new Message(`You've been summoned by ^3[${Ranks[foundPlayer.Rank]}] ^0- ^3${foundPlayer.Name}^0.`, SystemTypes.Admin));
          emitNet(Events.receiveClientCB, "SUCCESS", data); // CB true to the staff summoning you
        } else {
          emitNet(Events.receiveClientCB, "ERROR_TPING", data); // CB false to the staff summoning you
        }
      }
    }
  }

  
  private async CALLBACK_getSummonReturned(data: any): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const foundPlayer = new svPlayer(data.player);
      if (foundPlayer) {
        if (this.summonLastLocation !== undefined) {
          const teleported = await teleportToCoords(this.summonLastLocation);
          if (teleported) {
            this.summonLastLocation = undefined; // Set our previous summon location to null

            emit(Events.sendSystemMessage, new Message(`You've been returned to your previous location, by ^3[${Ranks[foundPlayer.Rank]}] ^0- ^3${foundPlayer.Name}^0.`, SystemTypes.Admin));
            emitNet(Events.receiveClientCB, "SUCCESS", data); // CB true to the staff returning you
          } else {
            emitNet(Events.receiveClientCB, "ERROR_TPING", data); // CB false to the staff returning you
          }
        } else {
          emitNet(Events.receiveClientCB, "NO_SUMMON_LAST_LOCATION", data); // CB false to the staff returning you
        }
      }
    }
  }
}
