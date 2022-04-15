import { Audio, Game, Ped, Scaleform, Vector3 } from "fivem-js";

import { Client } from "../../client";
import { teleportToCoords, NumToVector3, Delay, keyboardInput, Inform } from "../../utils";

import { Menu } from "../../models/ui/menu/menu";
import { Submenu } from "../../models/ui/menu/submenu";
import { Notification } from "../../models/ui/notification";
import { svPlayer } from "../../models/player";

import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { Weapons } from "../../../shared/enums/weapons";
import { Ranks } from "../../../shared/enums/ranks";
import { Weathers, WinterWeathers } from "../../../shared/enums/sync/weather";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";

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
  private spectateTarget: Ped = undefined;

  // Menus [Server Management]
  private serverMenu: Submenu;
  private weatherMenu: Submenu;
  private timeMenu: Submenu;

  // Menus [Actions]
  private playerActionsMenu: Submenu;
  private vehicleActionsMenu: Submenu;

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
  private visible: boolean = true;

  // [Weapon] Data
  private lastLocation: Vector3;
  private noReload: boolean = false;
  private infiniteAmmo: boolean = false;
  private noRecoil: boolean = false;

  // Ticks
  private weaponTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    if (this.client.player.Rank >= Ranks.Admin) {

      // Events
      onNet(Events.teleportToMarker, this.EVENT_tpm.bind(this));
      onNet(Events.teleportBack, this.EVENT_teleportBack.bind(this));
      onNet(Events.receiveWarning, this.EVENT_receiveWarning.bind(this));
      onNet(Events.goToPlayer, this.EVENT_goToPlayer.bind(this));
      onNet(Events.startSpectating, this.EVENT_startSpectating.bind(this));

      // Key Mapped Commands
      RegisterCommand("+toggle_menu", this.toggleMenu.bind(this), false);

      RegisterCommand("open_admin", async() => {
        this.refreshPlayers();
        await this.menu.Open();
      }, false);

      Inform("Staff | Menu Controller", "Started!");
    }
  }

  // Getters
  public get WeaponActive(): boolean {
    return this.weaponTick !== undefined;
  }

  public get NoRecoil(): boolean {
    return this.noRecoil;
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

  public init(): void {
    // Get Menu Data
    this.getWeatherTypes();
    this.getTimes();

    this.menu = new Menu("Staff Menu (Temp)", GetCurrentResourceName(), MenuPositions.MiddleRight);

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

        const myPed = Game.PlayerPed;
        myPed.IsInvincible = this.godmode;
        SetPlayerInvincible(Game.Player.Handle, this.godmode);
        myPed.CanRagdoll = !this.godmode;
        myPed.clearBloodDamage();
        myPed.resetVisibleDamage();
        myPed.clearLastWeaponDamage();
        SetEntityProofs(myPed.Handle, this.godmode, this.godmode, this.godmode, this.godmode, this.godmode, this.godmode, this.godmode, this.godmode);
        myPed.IsOnlyDamagedByPlayer = !this.godmode;
        SetEntityCanBeDamaged(myPed.Handle, !this.godmode);
      });

      this.playerActionsMenu.BindCheckbox("Invisible", this.visible, (newState: boolean) => {
        this.visible = newState;

        const myPed = Game.PlayerPed;
        myPed.IsVisible = this.visible;
      });

      this.playerActionsMenu.BindCheckbox("Infinite Ammo", this.infiniteAmmo, (newState: boolean) => {
        this.infiniteAmmo = newState;
        SetPedInfiniteAmmoClip(Game.PlayerPed.Handle, this.infiniteAmmo);
      });

      this.playerActionsMenu.BindCheckbox("No Reload", this.noReload, (newState: boolean) => {
        this.noReload = newState;
      });

      this.playerActionsMenu.BindCheckbox("No Recoil", this.noRecoil, (newState: boolean) => {
        this.noRecoil = newState;
      });
    }

    this.playerActionsMenu.BindButton("Teleport To Marker", async() => {
      await this.EVENT_tpm();
    });
    
    this.playerActionsMenu.BindButton("Go To Previous Location", async() => {
      await this.EVENT_teleportBack();
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
        } else {
          const notify = new Notification("Mechanic", "Your vehicle isn't damaged!", NotificationTypes.Error);
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
      console.log("char", playerData.Character === undefined)

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
        console.log("set length type", this.banLengthType);
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

      banMenu.BindButton("Ban", () => {
        if (!this.banPermanent) {
          emitNet(Events.banPlayer, playerData.Id, this.banReason, this.banPermanent, this.banLengthType.toUpperCase(), this.banLength);
        } else {
          emitNet(Events.banPlayer, playerData.Id, this.banReason, this.banPermanent);
        }
      });

      menu.BindButton("Kick", async() => {
        const kickReason = await keyboardInput("Kick Reason", 250);
        if (kickReason != null) {
          if (kickReason.length > 0) {
            this.kickReason = kickReason;
            console.log(`Kick (${playerData.NetworkId} | ${playerData.Name} | ${this.kickReason})`);
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
            console.log(`Warn (${playerData.NetworkId} | ${playerData.Name} | ${warnReason})`);
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
            console.log(`Commend (${playerData.Id} | ${playerData.NetworkId}) for ${commendReason}`);
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

      menu.BindButton("Freeze", () => {
        console.log(`Freeze (${playerData.NetworkId} | ${playerData.Name})`);
        emitNet(Events.freezePlayer, playerData.Id);
      });

      menu.BindButton("Teleport To", () => {
        console.log(`Teleport To (${playerData.NetworkId} | ${playerData.Name})`);
        emitNet(Events.tpToPlayer, playerData.Id);
      });

      menu.BindButton("Teleport Inside Vehicle", () => {
        console.log(`Teleport Inside Vehicle (${playerData.NetworkId} | ${playerData.Name})`);
        emitNet(Events.tpToVehicle, playerData.Id);
      });

      menu.BindButton("Spectate", () => {
        console.log(`Spectate (${playerData.NetworkId} | ${playerData.Name})`);
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
        
        // Not unarmed
        if (currWeapon !== Weapons.Unarmed) {
          // Shoots bullets
          if (GetWeaponDamageType(currWeapon) === 3) {
            // [No Reload]
            if (currWeapon !== Weapons.MiniGun) {
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
    });
  }

  public stopWeapon(): void {
    if (this.weaponTick !== undefined) {
      clearTick(this.weaponTick);
      this.weaponTick = undefined;
    }
  }

  private async toggleMenu(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      if (!await this.client.menuManager.IsMenuOpen(this.menu.handle)) {
        this.refreshPlayers();
        await this.menu.Open();
      }
    }
  }

  // Events
  public async EVENT_tpm(): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const myPed = Game.PlayerPed;

      if (!IsWaypointActive()) {
        const notify = new Notification("TPM", "You don't have a waypoint set!", NotificationTypes.Error);
        return
      }

      const waypointHandle = GetFirstBlipInfoId(8);

      if (DoesBlipExist(waypointHandle)) {
        this.lastLocation = myPed.Position;

        const waypointCoords = NumToVector3(GetBlipInfoIdCoord(waypointHandle));
        const teleported = await teleportToCoords(waypointCoords);
        if (teleported) {
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

          this.lastLocation = undefined;
        }
      } else {
        const notify = new Notification("Teleporter", "You haven't teleported anywhere!", NotificationTypes.Error);
        await notify.send();
      }
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
          emit(Events.sendSystemMessage, new Message(`You've teleported to ${foundPlayer.Name}.`, SystemTypes.Admin));
        }
      }
    }
  }

  private async EVENT_startSpectating(player: svPlayer, playerPos: Vector3): Promise<void> {
    if (this.client.player.Rank >= Ranks.Admin) {
      const foundPlayer = new svPlayer(player);
      if (foundPlayer) {
        if (this.spectateTarget !== undefined && this.spectateTarget.Handle !== foundPlayer.Ped.Handle) this.spectatingPlayer = false;

        this.spectatingPlayer = !this.spectatingPlayer;

        console.log("spectate", this.spectatingPlayer);

        if (this.spectatingPlayer) {
          this.spectateLastPos = Game.PlayerPed.Position;
          Game.PlayerPed.IsVisible = false;
          
          const teleported = await teleportToCoords(playerPos);
          if (teleported) {
            NetworkSetInSpectatorMode(true, foundPlayer.Ped.Handle);
            this.spectateTarget = foundPlayer.Ped;
            emit(Events.sendSystemMessage, new Message(`You've started spectating ${foundPlayer.Name}.`, SystemTypes.Admin));
          }
        } else {
          Game.PlayerPed.IsVisible = true;
          const teleported = await teleportToCoords(playerPos);
          if (teleported) {
            NetworkSetInSpectatorMode(false, foundPlayer.Ped.Handle);
            this.spectateTarget = undefined;
            emit(Events.sendSystemMessage, new Message(`You've stopped spectating ${foundPlayer.Name}.`, SystemTypes.Admin));
          }
        }
      }
    }
  }
}