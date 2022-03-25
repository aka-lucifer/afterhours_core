import {Game, Vector3, VehicleSeat, World, Model, Entity} from "fivem-js"

import { svPlayer } from "./models/player";
import {Notification} from "./models/ui/notification";
import { Character } from "./models/character";

// [Managers] Client Data
import {RichPresence} from "./managers/richPresence";
import {StaffManager} from "./managers/staff";

// [Managers] Syncing
import {WorldManager} from "./managers/sync/world";
import {TimeManager} from "./managers/sync/time";
import {WeatherManager} from "./managers/sync/weather";

// [Managers] Callbacks
import {ServerCallbackManager} from "./managers/serverCallbacks";

// [Managers] UI
import {Spawner} from "./managers/ui/spawner";
import {Characters} from "./managers/ui/characters";
import {Vehicles} from "./managers/ui/vehicles";
import {ChatManager} from "./managers/ui/chat";
import {Scoreboard} from "./managers/ui/scoreboard";
import {Warnings} from "./managers/ui/warnings";
import {Commends} from "./managers/ui/commends";

// [Managers] Jobs
import { JobManager } from "./managers/job";

// [Controllers] Police
// import {CuffingStuff} from "./controllers/jobs/police/cuffing";
// import {HelicamManager} from "./controllers/jobs/police/helicam";
import { Grabbing } from "./controllers/jobs/police/grabbing";

// [Controllers] Normal
import { PlayerNames } from "./controllers/playerNames";
import { AFK } from "./controllers/afk";

import {Delay, Inform, insideVeh, Log, NumToVector3, RegisterNuiCallback} from "./utils";

// Shared
import {Events} from "../shared/enums/events/events";
import {GameEvents} from "../shared/enums/events/gameEvents";
import {LXEvents} from "../shared/enums/events/lxEvents";
import {Callbacks} from "../shared/enums/events/callbacks";
import {Weapons} from "../shared/enums/weapons";
import {NuiMessages} from "../shared/enums/ui/nuiMessages";
import { Message } from "../shared/models/ui/chat/message";
import { SystemTypes } from "../shared/enums/ui/chat/types";
import {NotificationTypes} from "../shared/enums/ui/notifications/types";
import { NuiCallbacks } from "../shared/enums/ui/nuiCallbacks";
import {Jobs} from "../shared/enums/jobs/jobs";


import clientConfig from "../configs/client.json";
import sharedConfig from "../configs/shared.json";

let takingScreenshot = false;

export class Client {
// Client Data
  private debugging: boolean;
  private initialSpawn: boolean;
  private developmentMode: boolean = false;
  private players: svPlayer[] = [];
  private richPresenceData: Record<string, any>;
  private nuiReady: boolean = false;
  private started: boolean = false;
  private usingKeyboard: boolean = false;

  // Player Data
  private statesTick: number = undefined;
  public playerStates: EntityInterface;
  
  public player: svPlayer;
  public character: Character;

  // [Managers]
  private richPresence: RichPresence;
  private staffManager: StaffManager;

  // [Managers] Syncing
  private worldManager: WorldManager;
  private timeManager: TimeManager;
  private weatherManager: WeatherManager;

  // [Managers] Callbacks
  public serverCallbackManager: ServerCallbackManager;

  // [Managers] UI
  private spawner: Spawner;
  public characters: Characters;
  public vehicles: Vehicles;
  private chatManager: ChatManager;
  private scoreboard: Scoreboard;
  private warnings: Warnings;
  private commends: Commends;

  // [Managers] Jobs
  private jobManager: JobManager;

  // [Controllers] Police
  // private cuffing: CuffingStuff;
  // private helicam: HelicamManager;
  private grabbing: Grabbing;

  // [Controllers] Normal
  private playerNames: PlayerNames;
  private afk: AFK;

  constructor() {
    this.debugging = clientConfig.debug;
    this.developmentMode = (GetConvar('development_server', 'false') === "true");
    this.richPresenceData = clientConfig.richPresence;
    this.initialSpawn = true;
    
    // Events
    // (Resources)
    // on(Events.resourceStart, this.EVENT_resourceRestarted.bind(this));
    on(Events.resourceStop, this.EVENT_resourceStop.bind(this));

    // NUI Ready
    RegisterNuiCallback(NuiCallbacks.Ready, this.nuiLoaded.bind(this));

    // (Player Data)
    onNet(Events.playerLoaded, this.EVENT_playerLoaded.bind(this));
    onNet(Events.setCharacter, this.EVENT_setCharacter.bind(this));
    onNet(Events.developmentMode, this.EVENT_developmentMode.bind(this));
    onNet(Events.syncPlayers, this.EVENT_syncPlayers.bind(this));
    
    // (General Event Listeners)
    onNet(Events.gameEventTriggered, this.EVENT_gameEvent.bind(this));
    onNet(LXEvents.Gunshot, this.EVENT_gunFired.bind(this));
    onNet(Events.notify, this.EVENT_notify.bind(this));

    // (General Methods)
    onNet(Events.teleportToMarker, this.EVENT_tpm.bind(this));
    onNet(Events.clearWorldVehs, this.EVENT_clearVehs.bind(this))

    // Callbacks
    onNet(Callbacks.takeScreenshot, this.CALLBACK_screenshot.bind(this));
  }

  // Getters & Setters 
  public get IsDebugging(): boolean {
    return this.debugging;
  }

  public get Developing(): boolean {
    return this.developmentMode;
  }

  public get Discord(): Record<string, any> {
    return this.richPresenceData;
  }

  public get UsingKeyboard(): boolean {
    return this.usingKeyboard;
  }

  public set UsingKeyboard(newState: boolean) {
    this.usingKeyboard = newState;
  }

  public get Spawned(): boolean {
    return !this.initialSpawn; // Returns the opposite, as the default of initalSpawn is true.
  }
  
  public get Player(): svPlayer {
    return this.player;
  }

  public get Players(): svPlayer[] {
    return this.players;
  }
  
  public get Character(): Character {
    return this.character;
  }

  // Methods
  public async initialize(): Promise<void> {
    // [Managers] Server Data
    this.richPresence = new RichPresence(client);
    this.staffManager = new StaffManager(client);

    // [Managers] Syncing
    this.worldManager = new WorldManager(client);
    this.timeManager = new TimeManager(client);
    this.weatherManager = new WeatherManager(client);

    // [Managers] Callbacks
    this.serverCallbackManager = new ServerCallbackManager(client);

    // [Managers] UI
    this.spawner = new Spawner(client);
    this.characters = new Characters(client);
    this.vehicles = new Vehicles(client);
    this.chatManager = new ChatManager(client);
    this.scoreboard = new Scoreboard(client);
    this.warnings = new Warnings(client);
    this.commends = new Commends(client);

    // [Managers] Jobs
    this.jobManager = new JobManager(client);

    // [Controllers] Police
    // this.cuffing = new CuffingStuff();
    // this.helicam = new HelicamManager(client);
    this.grabbing = new Grabbing();

    // [Controllers] Normal
    this.playerNames = new PlayerNames(client);
    this.afk = new AFK(client);

    this.registerExports();

    Inform(sharedConfig.serverName, "Successfully Loaded!");

    RegisterCommand("pistol", () => {
      const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
      if (currWeapon == Weapons.BerettaM9) {
        console.log(`Pistol Data: ${JSON.stringify(sharedConfig.weapons[currWeapon])}`)
      }
    }, false);

    // RegisterCommand("cuff", async() => {
    //   const [ped, distance] = await closestPed();
    //   this.cuffing.init(ped.Handle);
    // }, false);
  }

  public async nuiLoaded(cb: any, data: Record<string, any>): Promise<void> {
    // console.log("NUI READY!");
    this.nuiReady = true;
    await this.initialize();
    this.startUI();

    emitNet(Events.playerConnected, undefined, true);
  }

  private startUI(): void {
    this.chatManager.init();
  }

  private setupUI(): void {
    this.chatManager.setupData();
    
    if (!this.Developing) {
      this.spawner.init();
    } else {
      this.characters.displayCharacters(true);
    }
  }

  private registerStates(): void {
    let paused = false;
    
    this.playerStates = Player(GetPlayerServerId(Game.Player.Handle));
    this.playerStates.state.set("rankVisible", true, true);
    this.playerStates.state.set("chatOpen", false, true);
    this.playerStates.state.set("afk", false, true);
    this.playerStates.state.set("paused", false, true);

    this.statesTick = setTick(async() => {

      if (IsPauseMenuActive()) {
        this.playerStates.state.set("paused", true, true);
        if(!paused) paused = true;
      } else {
        if (paused) {
          this.playerStates.state.set("paused", false, true);
          paused = false;
        }
      }

      await Delay(500);
    });
  }
  
  private registerExports(): void {
    global.exports("getPlayer", async(source: string) => {
      return this.player;
    });

    global.exports("getCharacter", async(source: string) => {
      return this.character;
    });

    global.exports("notify", async(header: string, body: string, type: NotificationTypes, timer?: number, progress?: boolean) => {
      const notify = new Notification(header, body, type, timer, progress);
      await notify.send();
    });

    global.exports("usingKeyboard", this.UsingKeyboard);
  }

  private async teleportToCoords(coords: Vector3, heading?: number): Promise<boolean> {
    let success = false;

    // Is player in a vehicle and the driver? Then we'll use that to teleport.
    const [currVeh, inside] = await insideVeh(Game.PlayerPed);
    const restoreVehVisibility = inside && currVeh.IsVisible;
    const restorePedVisibility = Game.PlayerPed.IsVisible;

    // Freeze vehicle or player location and fade out the entity to the network.
    if (inside) {
      currVeh.IsPositionFrozen = true;
      if (currVeh.IsVisible) {
        NetworkFadeOutEntity(currVeh.Handle, true, false);
      }
    } else {
      ClearPedTasksImmediately(Game.PlayerPed.Handle);
      Game.PlayerPed.IsPositionFrozen = true;
      if (Game.PlayerPed.IsVisible) {
        NetworkFadeOutEntity(Game.PlayerPed.Handle, true, false);
      }
    }

    // Fade out the screen and wait for it to be faded out completely.
    DoScreenFadeOut(500);
    while (!IsScreenFadedOut())
    {
      await Delay(0);
    }

    // This will be used to get the return value from the groundz native.
    let groundZ = 850.0;

    // Bool used to determine if the groundz coord could be found.
    let found = false;

    // Loop from 950 to 0 for the ground z coord, and take away 25 each time.
    for (let zz = 950.0; zz >= 0.0; zz -= 25.0) {
      let z = zz;
      // The z coord is alternating between a very high number, and a very low one.
      // This way no matter the location, the actual ground z coord will always be found the fastest.
      // If going from top > bottom then it could take a long time to reach the bottom. And vice versa.
      // By alternating top/bottom each iteration, we minimize the time on average for ANY location on the map.
      if (zz % 2 != 0) {
        z = 950.0 - zz;
      }

      // Request collision at the coord. I've never actually seen this do anything useful, but everyone keeps telling me this is needed.
      // It doesn't matter to get the ground z coord, and neither does it actually prevent entities from falling through the map, nor does
      // it seem to load the world ANY faster than without, but whatever.
      RequestCollisionAtCoord(coords.x, coords.y, z);

      // Request a new scene. This will trigger the world to be loaded around that area.
      NewLoadSceneStart(coords.x, coords.y, z, coords.x, coords.y, z, 50.0, 0);

      // Timer to make sure things don't get out of hand (player having to wait forever to get teleported if something fails).
      let tempTimer = GetGameTimer();

      // Wait for the new scene to be loaded.
      while (IsNetworkLoadingScene())
      {
        // If this takes longer than 1 second, just abort. It's not worth waiting that long.
        if (GetGameTimer() - tempTimer > 1000)
        {
          Inform("TeleportToCoords Method", "Waiting for the scene to load is taking too long (more than 1s). Breaking from wait loop.");
          break;
        }

        await Delay(0);
      }

      // If the player is in a vehicle, teleport the vehicle to this new position.
      if (inside) {
        SetEntityCoords(currVeh.Handle, coords.x, coords.y, z, false, false, false, true);
      }
      // otherwise, teleport the player to this new position.
      else {
        SetEntityCoords(Game.PlayerPed.Handle, coords.x, coords.y, z, false, false, false, true);
      }

      // Reset the timer.
      tempTimer = GetGameTimer();

      // Wait for the collision to be loaded around the entity in this new location.
      while (!HasCollisionLoadedAroundEntity(Game.PlayerPed.Handle))
      {
        // If this takes too long, then just abort, it's not worth waiting that long since we haven't found the real ground coord yet anyway.
        if (GetGameTimer() - tempTimer > 1000)
        {
          Inform("TeleportToCoords Method", "Waiting for the collision is taking too long (more than 1s). Breaking from wait loop.");
          break;
        }

        await Delay(0);
      }

      // Check for a ground z coord.
      [found, groundZ] = GetGroundZFor_3dCoord(coords.x, coords.y, z, false);

      // If we found a ground z coord, then teleport the player (or their vehicle) to that new location and break from the loop.
      if (found)
      {
        Inform("TeleportToCoords Method", `Ground coordinate found: ${groundZ}`);
        if (inside) {
          SetEntityCoords(currVeh.Handle, coords.x, coords.y, groundZ, false, false, false, true);

          // We need to unfreeze the vehicle because sometimes having it frozen doesn't place the vehicle on the ground properly.
          currVeh.IsPositionFrozen = false;
          currVeh.placeOnGround();
          // Re-freeze until screen is faded in again.
          currVeh.IsPositionFrozen = true;
          success = true;
        }
        else {
          SetEntityCoords(Game.PlayerPed.Handle, coords.x, coords.y, groundZ, false, false, false, true);
          success = true;
        }

        break;
      }

      // Wait 10ms before trying the next location.
      await Delay(10);
    }

    // If the loop ends but the ground z coord has not been found yet, then get the nearest vehicle node as a fail-safe coord.
    if (!found)
    {
      const safePos = coords;
      GetNthClosestVehicleNode(coords.x, coords.y, coords.z, 0, 0, 0, 0);

      // Notify the user that the ground z coord couldn't be found, so we will place them on a nearby road instead.
      Log("TeleportToCoords Method", "Could not find a safe ground coord. Placing you on the nearest road instead.");

      // Teleport vehicle, or player.
      if (inside) {
        SetEntityCoords(currVeh.Handle, safePos.x, safePos.y, safePos.z, false, false, false, true);
        currVeh.IsPositionFrozen = false;
        currVeh.placeOnGround();
        currVeh.IsPositionFrozen = true;
        success = true;
      }
      else {
        SetEntityCoords(Game.PlayerPed.Handle, safePos.x, safePos.y, safePos.z, false, false, false, true);
        success = true;
      }
    }

    // Once the teleporting is done, unfreeze vehicle or player and fade them back in.
    if (inside) {
      if (restoreVehVisibility)
      {
        NetworkFadeInEntity(currVeh.Handle, true);
        if (!restorePedVisibility)
        {
          Game.PlayerPed.IsVisible = false;
        }
      }
      currVeh.IsPositionFrozen = false;
    }
    else {
      if (restorePedVisibility)
      {
        NetworkFadeInEntity(Game.PlayerPed.Handle, true);
      }
      Game.PlayerPed.IsPositionFrozen = false;
    }

    // Fade screen in and reset the camera angle.
    DoScreenFadeIn(500);
    SetGameplayCamRelativePitch(0.0, 1.0);
    return success;
  }

  // Events
  private EVENT_resourceStop(resourceName: string): void{
    if (resourceName == GetCurrentResourceName()) {
      this.grabbing.stop();
    }
  }

  private async EVENT_playerLoaded(player: any): Promise<void> {
    this.player = new svPlayer(player);

    // Manager Inits
    this.staffManager.init();
    await this.worldManager.init();
    this.jobManager.init();

    this.setupUI();
    
    // Register Player Statebags
    this.registerStates();
  }

  private EVENT_setCharacter(character: any): void {
    Game.PlayerPed.removeAllWeapons();
    this.character = new Character(character);

    // console.log("Character Set To", this.Character);
  }

  private EVENT_developmentMode(newState: boolean): void {
    this.developmentMode = newState;
  }

  private EVENT_syncPlayers(newPlayers: any[]) {
    this.players = [];
    
    for (let i = 0; i < Object.keys(newPlayers).length; i++) {
      const player = new svPlayer(newPlayers[i]);
      this.players.push(player);
    }
    
    Inform("Syncing Players", `Server players is now ${JSON.stringify(this.players)}`);
  }

  private async EVENT_tpm(): Promise<void> {
    const myPed = Game.PlayerPed;

    if (!IsWaypointActive()) {
      const notify = new Notification("TPM", "You don't have a waypoint set!", NotificationTypes.Error);
      return
    }

    const waypointHandle = GetFirstBlipInfoId(8);

    if (DoesBlipExist(waypointHandle)) {
      const waypointCoords = NumToVector3(GetBlipInfoIdCoord(waypointHandle));
      const teleported = await this.teleportToCoords(waypointCoords);
      if (teleported) {
        emit(Events.sendSystemMessage, new Message("Teleported to waypoint.", SystemTypes.Interaction));
        const notify = new Notification("Teleporter", "Teleported to waypoint", NotificationTypes.Success);
        await notify.send();
      }
    }
  }

  private EVENT_clearVehs(): void {
    const worldVehs = World.getAllVehicles();
    worldVehs.forEach(vehicle => {
      vehicle.delete();
      vehicle.markAsNoLongerNeeded();
    });
  }

  private EVENT_pedDied(damagedEntity: number, attackingEntity: number, weaponHash: number, isMelee: boolean): void {
    if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
      if (IsPedAPlayer(attackingEntity)) {
        emitNet(Events.logDeath, {
          type: GetEntityType(attackingEntity),
          inVeh: IsPedInAnyVehicle(attackingEntity, false) && GetPedInVehicleSeat(GetVehiclePedIsIn(attackingEntity, false), VehicleSeat.Driver),
          weapon: weaponHash,
          attacker: GetPlayerServerId(NetworkGetPlayerIndexFromPed(attackingEntity))
        });
      } else {
        if (attackingEntity == -1) {
          emitNet(Events.logDeath, {
            attacker: attackingEntity
          });
        }
      }
    }
  }

  private EVENT_gameEvent(eventName: string, eventArgs: any[]): void {
    if (eventName == GameEvents.entityDamaged) {
      const damagedEntity = eventArgs[0];
      const attackingEntity = eventArgs[1];

      if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
        if (IsPedAPlayer(attackingEntity)) {
          const isFatal = eventArgs[5];
          if (isFatal) {
            emitNet(Events.logDeath, {
              type: GetEntityType(attackingEntity),
              inVeh: IsPedInAnyVehicle(attackingEntity, false) && GetPedInVehicleSeat(GetVehiclePedIsIn(attackingEntity, false), VehicleSeat.Driver),
              weapon: eventArgs[6],
              attacker: GetPlayerServerId(NetworkGetPlayerIndexFromPed(eventArgs[1]))
            });
          }
        } else {
          if (attackingEntity == -1) {
            emitNet(Events.logDeath, {
              attacker: attackingEntity
            });
          }
        }
      }
    }
  }

  private EVENT_gunFired(shootersNet: number): void {
    Inform("LX Event (Gunshot)", `${shootersNet} fired their weapon!`);
  }

  private EVENT_notify(title: string, description: string, type: NotificationTypes, timer: number, progressBar: boolean): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.CreateNotification,
      data: {
        title: title,
        text: description,
        status: type,
        effect: "slide",
        speed: 300,
        autoclose: true,
        autotimeout: timer,
        type: 2,
        position: "top left",
        progress: progressBar,
        showCloseButton: false
      }
    }));
  }

  // Callbacks
  private CALLBACK_screenshot(data): void { // Screenshot Client CB
    if (!takingScreenshot) {
      takingScreenshot = true;
      global.exports['astrid_notify'].requestScreenshotUpload("https://api.imgur.com/3/image", 'imgur', {
        headers: {
          ['authorization']: "Client-ID 3886c6731298c37",
          ['content-type']: 'multipart/form-data'
        }
      }, (results) => {
        console.log(JSON.parse(results).data.link)
        data.url = JSON.parse(results).data.link;
        takingScreenshot = false
        emitNet(Events.receiveClientCB, false, data);
      });
    }
  }
}

export const client = new Client();
