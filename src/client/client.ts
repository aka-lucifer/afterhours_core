import {Game, Ped, Vector3, VehicleSeat, } from "fivem-js"

import { svPlayer } from "./models/player";
import {Notification} from "./models/ui/notification";
import { Character } from "./models/character";

// [Managers] Client Data
import {RichPresence} from "./managers/richPresence";
import {StaffManager} from "./managers/staff";

// [Managers] World
import {WorldManager} from "./managers/world/world";
import { SafezoneManager } from "./managers/world/safezones";

// [Managers] Syncing
import {TimeManager} from "./managers/sync/time";
import {WeatherManager} from "./managers/sync/weather";
import { AOPManager } from "./managers/sync/aop";

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
import { MenuManager } from "./managers/ui/menu";

// [Managers] Job
import { JobManager } from "./managers/job";

// [Managers] Vehicle
import { VehicleManager } from "./managers/vehicle";

// [Managers] Vehicle
import { WeaponManager } from "./managers/weapon";

// [Controllers] Police
// import {HelicamManager} from "./controllers/jobs/police/helicam";

// [Controllers] World
import { WorldBlips } from './controllers/world/worldBlips';

// [Controllers] UI
import { BugReporting } from './controllers/ui/bugReporting';
import { HexMenu } from './controllers/ui/hexMenu';
import { Hud } from './controllers/ui/hud';

// [Controllers] Normal
import { Death } from './controllers/death';
import { PlayerNames } from "./controllers/playerNames";
import { AFK } from "./controllers/afk";

import { Delay, Inform, keyboardInput, RegisterNuiCallback, speedToMph } from './utils';

// Shared
import {Events} from "../shared/enums/events/events";
import {GameEvents} from "../shared/enums/events/gameEvents";
import {Callbacks} from "../shared/enums/events/callbacks";
import {NuiMessages} from "../shared/enums/ui/nuiMessages";
import {NotificationTypes} from "../shared/enums/ui/notifications/types";
import { NuiCallbacks } from "../shared/enums/ui/nuiCallbacks";
import { Ranks } from '../shared/enums/ranks';
import { CuffState } from '../shared/enums/jobs/cuffStates';
import { InteractionStates } from '../shared/enums/jobs/interactionStates';
import { GrabState } from '../shared/enums/jobs/grabStates';
import { DeathStates } from '../shared/enums/deathStates';
import { Jobs } from '../shared/enums/jobs/jobs';
import { Message } from '../shared/models/ui/chat/message';
import { SystemTypes } from '../shared/enums/ui/chat/types';

import clientConfig from "../configs/client.json";
import sharedConfig from "../configs/shared.json";

let takingScreenshot = false;

export class Client {
// Client Data
  private debugging: boolean;
  private initialSpawn: boolean;
  private developmentMode: boolean = false;
  private readonly maxPlayers: number;
  private players: svPlayer[] = [];
  private nuiReady: boolean = false;
  private started: boolean = false;
  private usingKeyboard: boolean = false;

  // Player Data
  private teleporting: boolean = false;
  private statesTick: number = undefined;
  public playerStates: EntityInterface;
  
  public player: svPlayer;
  public character: Character;

  // [Managers]
  public richPresence: RichPresence;
  public staffManager: StaffManager;

  // [Managers] World
  private worldManager: WorldManager;
  public safezoneManager: SafezoneManager;

  // [Managers] Syncing
  public timeManager: TimeManager;
  private weatherManager: WeatherManager;
  public aopManager: AOPManager;

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
  public menuManager: MenuManager;

  // [Managers] Job
  public jobManager: JobManager;

  // [Managers] Vehicle
  public vehicleManager: VehicleManager;

  // [Managers] Weapon
  public weaponManager: WeaponManager;

  // [Controllers] Police
  // private helicam: HelicamManager;

  // [Controllers] World
  private worldBlips: WorldBlips;

  // [Controllers] UI
  private bugReporting: BugReporting;
  public hexMenu: HexMenu;
  public hud: Hud;

  // [Controllers] Normal
  private death: Death;
  private playerNames: PlayerNames;
  private afk: AFK;

  constructor() {
    this.debugging = clientConfig.debug;
    this.developmentMode = (GetConvar('development_server', 'false') === "true");
    this.maxPlayers = GetConvarInt("sv_maxclients", 32);
    this.initialSpawn = true;
    
    // Events
    // (Resources)
    on(Events.mapStarted, this.disableAutospawn.bind(this));
    on(Events.resourceStart, this.disableAutospawn.bind(this));
    on(Events.resourceStop, this.EVENT_resourceStop.bind(this));

    // NUI/Game Ready
    RegisterNuiCallback(NuiCallbacks.Ready, this.nuiLoaded.bind(this));
    on(Events.playerSpawned, this.EVENT_disableLoading.bind(this));

    // (Player Data)
    onNet(Events.playerLoaded, this.EVENT_playerLoaded.bind(this));
    onNet(Events.setCharacter, this.EVENT_setCharacter.bind(this));
    onNet(Events.updateCharacter, this.EVENT_updateCharacter.bind(this));
    onNet(Events.changeDevMode, this.EVENT_changeDevMode.bind(this));
    onNet(Events.syncPlayers, this.EVENT_syncPlayers.bind(this));
    
    // (General Event Listeners)
    onNet(Events.gameEventTriggered, this.EVENT_gameEvent.bind(this));
    onNet(Events.notify, this.EVENT_notify.bind(this));

    // Callbacks
    onNet(Callbacks.takeScreenshot, this.CALLBACK_screenshot.bind(this));

    RegisterCommand("hash", () => {
      if (this.developmentMode) {
        if (this.player.Spawned) {
          if (this.player.Rank >= Ranks.Developer) {
            const myPed = Game.PlayerPed;
            if (IsPedInAnyVehicle(myPed.Handle, false)) {
              console.log(`Vehicle Hash: ${myPed.CurrentVehicle.Model.Hash}`);
            } else {
              console.log(`Weapon Hash: ${GetSelectedPedWeapon(myPed.Handle)}`);
            }
          }
        }
      }
    }, false);
  }

  // Getters & Setters 
  public get IsDebugging(): boolean {
    return this.debugging;
  }

  public get Developing(): boolean {
    return this.developmentMode;
  }

  public get MaxPlayers(): number {
    return this.maxPlayers;
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

  public get Teleporting(): boolean {
    return this.teleporting;
  }

  public set Teleporting(newState: boolean) {
    this.teleporting = newState;
  }

  // Methods (Handles disabling auto respawning when you die)
  private disableAutospawn(resourceName: string): void {
    if (resourceName !== undefined) {
      if (resourceName == GetCurrentResourceName()) {
        global.exports["spawnmanager"].setAutoSpawn(false);
        console.log("auto spawn disabled!");
      }
    }
  }

  public async initialize(): Promise<void> {
    // [Managers] Server Data
    this.richPresence = new RichPresence(client);
    this.richPresence.init();
    
    this.staffManager = new StaffManager(client);

    // [Managers] World
    this.worldManager = new WorldManager(client);
    this.safezoneManager = new SafezoneManager(client);
    this.safezoneManager.init();

    // [Managers] Syncing
    this.timeManager = new TimeManager(client);
    this.weatherManager = new WeatherManager(client);
    this.aopManager = new AOPManager(client);

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
    this.menuManager = new MenuManager(client);

    // [Managers] Job
    this.jobManager = new JobManager(client);

    // [Managers] Vehicle
    this.vehicleManager = new VehicleManager(client); // done
    this.vehicleManager.init(); // done
    //
    // // [Managers] Weapon
    this.weaponManager = new WeaponManager(client);
    this.weaponManager.init();

    // [Controllers] Police
    // this.helicam = new HelicamManager(client);

    // [Controllers] World
    this.worldBlips = new WorldBlips(client);
    this.worldBlips.init();

    // [Controllers] UI
    this.bugReporting = new BugReporting(client);
    this.bugReporting.init();

    this.hexMenu = new HexMenu();
    this.hexMenu.init();

    this.hud = new Hud(client);

    // [Controllers] Normal
    this.death = new Death(client);
    await this.death.init();

    this.playerNames = new PlayerNames(client);
    this.afk = new AFK(client);

    this.registerExports();

    Inform(sharedConfig.serverName, "Successfully Loaded!");
  }

  public async nuiLoaded(cb: any, data: Record<string, any>): Promise<void> {
    // console.log("NUI READY!");
    this.nuiReady = true;
    await this.initialize();
    await this.spawner.init();
    this.startUI();

    emitNet(Events.playerConnected, undefined, true);
  }

  private EVENT_disableLoading(): void {
    if (!this.started) {
		  ShutdownLoadingScreenNui();
      this.started = true;
    }
  }

  private startUI(): void {
    this.chatManager.init();
  }

  private setupUI(): void {
    this.chatManager.setupData(); // Send types and any client sided suggestions
    
    if (!this.Developing) {
      this.spawner.requestUI();
      this.richPresence.Text = "Viewing Changelog, Keybinds, Commands & Rules";
    } else {
      const aopPosition = this.aopManager.AOP.positions[Math.floor(Math.random() * this.aopManager.AOP.positions.length)];

      const spawnPosition = new Vector3(aopPosition.x, aopPosition.y, aopPosition.z);
      const spawnHeading = aopPosition.heading;

      // Get random model from AOP configuration.
      const randomModel = sharedConfig.aop.spawnModels[Math.floor(Math.random() * sharedConfig.aop.spawnModels.length)];

      // Spawn into the correct area
      global.exports["spawnmanager"].spawnPlayer({
        x: spawnPosition.x,
        y: spawnPosition.y,
        z: spawnPosition.z,
        heading: spawnHeading,
        model: randomModel,
      }); // Ensure player spawns into server (As we have disabled automatic spawning/respawning).

      DoScreenFadeIn(1200);

      this.characters.displayCharacters(true);
      this.richPresence.Text = "Selecting Character";
    }

    // Managers Inits
    this.aopManager.init();
    this.weaponManager.start();
    this.safezoneManager.start();

    if (this.developmentMode) {
      if (!this.worldBlips.Started) this.worldBlips.start();
    }
  }

  private registerStates(): void {
    let paused = false;
    
    this.playerStates = Player(GetPlayerServerId(Game.Player.Handle));

    // Staff
    this.playerStates.state.set("rankVisible", true, true);
    this.playerStates.state.set("frozen", false, true);
    
    // UI
    this.playerStates.state.set("chatOpen", false, true);
    
    // Player Name
    this.playerStates.state.set("afk", false, true);
    this.playerStates.state.set("paused", false, true);
    
    // Vehicle
    this.playerStates.state.set("seatbelt", false, true);

    // Jobs
    this.playerStates.state.set("cuffState", CuffState.Uncuffed, true);
    this.playerStates.state.set("grabState", GrabState.None, true);
    this.playerStates.state.set("interactionState", InteractionStates.None, true);
    this.playerStates.state.set("deathState", DeathStates.Alive, true);

    this.statesTick = setTick(async() => {

      if (IsPauseMenuActive()) {
        if (await this.menuManager.IsAnyMenuOpen()) {
          this.menuManager.hide();
        }

        this.playerStates.state.set("paused", true, true);
        if(!paused) paused = true;
      } else {
        if (paused) {
          if (this.menuManager.Hidden) {
            this.menuManager.show();
          }
          
          this.playerStates.state.set("paused", false, true);
          paused = false;
        }
      }

      await Delay(500);
    });
  }
  
  private registerExports(): void {
    global.exports("getPlayer", async() => {
      return this.player;
    });

    global.exports("getCharacter", async() => {
      return this.character;
    });

    global.exports("notify", async(header: string, body: string, type: NotificationTypes, timer?: number, progress?: boolean) => {
      const notify = new Notification(header, body, type, timer, progress);
      await notify.send();
    });

    global.exports("usingKeyboard", this.UsingKeyboard);

    global.exports("keyboardInput", keyboardInput);

    global.exports("isTeleporting", this.Teleporting);

    global.exports("teleporting", (newState: boolean) => {
      this.Teleporting = newState;
    });

    global.exports("getRanks", async() => {
      const ranks: Record<string, any> = {};
      for (let i = 0; i < Object.keys(Ranks).length; i++) {
        if (Ranks[i] != undefined) {
          ranks[i] = Ranks[i];
        }
      }

      return ranks;
    });
  }

  // Events
  private EVENT_resourceStop(resourceName: string): void {
    if (resourceName == GetCurrentResourceName()) {
      this.vehicleManager.weapon.stop();
      if (this.jobManager.policeJob !== undefined) {
        this.jobManager.policeJob.cuffing.stop();
        this.jobManager.policeJob.grabbing.stop();
      }
    }
  }

  private async EVENT_playerLoaded(player: any): Promise<void> {
    this.player = new svPlayer(player);

    // Manager Inits
    this.staffManager.init();
    await this.worldManager.init();

    this.setupUI();
    
    // Register Player Statebags
    this.registerStates();

    emit(Events.playerReady, this.player);
  }

  private async EVENT_setCharacter(character: any): Promise<void> {
    // Clear Previous Character Data
    Game.PlayerPed.removeAllWeapons();
    this.weaponManager.onBack.clearWeapons();

    // Load New Character Data
    this.character = new Character(character);

    await this.jobManager.init();

    if (this.character.isLeoJob()) {
      if (!this.jobManager.policeJob.ClockZonesCreated) this.jobManager.policeJob.createClockZones(); // Register clock on/off interactive zone
      // if (!this.jobManager.policeJob.commandMenu.Created) this.jobManager.policeJob.commandMenu.start(); // Start drawing markers and making menu interactive
      if (!this.jobManager.policeJob.garages.Setup) await this.jobManager.policeJob.garages.setup(); // If we haven't set up the police garages yet, set them up
    } else {
      if (this.jobManager.policeJob !== undefined) if (this.jobManager.policeJob.ClockZonesCreated) this.jobManager.policeJob.deleteClockZones(); // Delete clock on zones
      // if (!this.jobManager.policeJob.commandMenu.Created) this.jobManager.policeJob.commandMenu.stop(); // Delete command menu assets
    }

    if (this.character.Job.name !== Jobs.Community) {
      if (this.jobManager.communityJob !== undefined) {
        if (this.jobManager.communityJob.MenuBuilt) {
          this.jobManager.communityJob.destroyMenu();
        }
      }
    }

    // Set Rich Presence
    this.richPresence.Text = "Loading In As Character";
    this.richPresence.start();

    // Display location UI
    this.hud.init();

    if (this.character.Job.name === Jobs.Civilian) {
      emit(Events.sendSystemMessage,
        new Message(
          `Welcome to Astrid Network!<br><br>Make sure to join our Discord at Discord.gg/astrid<br><br>Also if you wish to be a Community Officer, use the /community command.`,
          SystemTypes.Announcement
        )
      );
    } else if (this.character.Job.name === Jobs.Community) {
      emit(Events.sendSystemMessage,
        new Message(
          `Welcome to Astrid Network!<br><br>Make sure to join our Discord at Discord.gg/astrid<br><br>To go on duty as a community officer, press your keybind (Default - F11).`,
          SystemTypes.Announcement
        )
      );
    }

    // console.log("Character Set To", this.Character);
  }

  private async EVENT_updateCharacter(character: any): Promise<void> {
    // Load New Character Data
    this.character = new Character(character);

    if (this.character.isLeoJob()) {
      if (!this.jobManager.policeJob.ClockZonesCreated) this.jobManager.policeJob.createClockZones(); // Register clock on/off interactive zone
      // if (!this.jobManager.policeJob.commandMenu.Created) this.jobManager.policeJob.commandMenu.start(); // Start drawing markers and making menu interactive
      if (!this.jobManager.policeJob.garages.Setup) await this.jobManager.policeJob.garages.setup(); // If we haven't set up the police garages yet, set them up
    } else {
      if (this.jobManager.policeJob !== undefined) if (this.jobManager.policeJob.ClockZonesCreated) this.jobManager.policeJob.deleteClockZones(); // Delete clock on zones
      // if (!this.jobManager.policeJob.commandMenu.Created) this.jobManager.policeJob.commandMenu.stop(); // Delete command menu assets
    }

    if (this.character.Job.name !== Jobs.Community) {
      if (this.jobManager.communityJob !== undefined) {
        if (this.jobManager.communityJob.MenuBuilt) {
          this.jobManager.communityJob.destroyMenu();
        }
      }
    }
  }

  private EVENT_changeDevMode(newState: boolean): void {
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
        // console.log(JSON.parse(results).data.link)
        data.url = JSON.parse(results).data.link;
        takingScreenshot = false
        emitNet(Events.receiveClientCB, false, data);
      });
    }
  }
}

export const client = new Client();
