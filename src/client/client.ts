import {Game, Vector3, VehicleSeat, World} from "fivem-js"

import {Player} from "./models/player";
import {Notification} from "./models/ui/notification";
import {NotificationTypes} from "./enums/ui/notifications/types";

// Server Data
import {RichPresence} from "./managers/richPresence";
import {ServerCallbackManager} from "./managers/serverCallbacks";

// UI
import {Spawner} from "./managers/ui/spawner";
import {ChatManager} from "./managers/ui/chat";
import {Scoreboard} from "./managers/ui/scoreboard";
import {Warnings} from "./managers/ui/warnings";
import {Commends} from "./managers/ui/commends";

// Jobs
// (Police)
import {CuffingStuff} from "./managers/jobs/police/cuffing";
import {HelicamManager} from "./managers/jobs/police/helicam";

import Config from "../configs/client.json";
import {closestPed, Delay, Inform} from "./utils";

import {Events} from "../shared/enums/events";
import {GameEvents} from "../shared/enums/gameEvents";
import {LXEvents} from "../shared/enums/lxEvents";
import {Callbacks} from "../shared/enums/callbacks";
import sharedConfig from "../configs/shared.json";
import {Weapons} from "../shared/enums/weapons";

let takingScreenshot = false;

export class Client {
  private debugging: boolean;
  private initialSpawn: boolean;
  private richPresenceData: Record<string, any>;

  // Player Data
  public player: Player;

  // Managers
  private richPresence: RichPresence;

  // Callbacks
  public serverCallbackManager: ServerCallbackManager;

  // UI
  private spawner: Spawner;
  private chatManager: ChatManager;
  private scoreboard: Scoreboard;
  private warnings: Warnings;
  private commends: Commends;

  // Jobs
  // (Police)
  private cuffing: CuffingStuff;
  private helicam: HelicamManager;

  constructor() {
    this.debugging = Config.debug;
    this.richPresenceData = Config.richPresence;
    this.initialSpawn = true;
    
    // Events
    on(Events.resourceStart, this.EVENT_resourceRestarted.bind(this));
    onNet(Events.playerLoaded, this.EVENT_playerLoaded.bind(this));
    onNet(Events.clearWorldVehs, this.EVENT_clearVehs.bind(this))
    onNet(Events.gameEventTriggered, this.EVENT_gameEvent.bind(this));
    // onNet(LXEvents.PedDied, this.EVENT_pedDied.bind(this));
    onNet(LXEvents.Gunshot, this.EVENT_gunFired.bind(this));

    // Callbacks
    onNet(Callbacks.takeScreenshot, this.CALLBACK_screenshot.bind(this));
  }

  // Get Requests
  public get IsDebugging(): boolean {
    return this.debugging;
  }

  public get Discord(): Record<string, any> {
    return this.richPresenceData;
  }

  public get Spawned(): boolean {
    return !this.initialSpawn; // Returns the opposite, as the default of initalSpawn is true.
  }

  // Methods
  public initialize(): void {
    this.richPresence = new RichPresence(client);
    this.serverCallbackManager = new ServerCallbackManager(client);
    
    // UI
    this.spawner = new Spawner(client);
    this.chatManager = new ChatManager(client);
    this.chatManager.init();
    this.scoreboard = new Scoreboard(client);
    this.warnings = new Warnings(client);
    this.commends = new Commends(client);

    // Jobs
    // (Police)
    this.cuffing = new CuffingStuff();
    this.helicam = new HelicamManager(client);
    Inform(sharedConfig.serverName, "Successfully Loaded!");

    RegisterCommand("pistol", () => {
      const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
      if (currWeapon == Weapons.Pistol) {
        console.log(`Pistol Data: ${JSON.stringify(sharedConfig.weapons[currWeapon])}`)
      }
    }, false);

    RegisterCommand("compass", () => {
      const directions: number[] = [
        0,
        45,
        90,
        135,
        180,
        225,
        270,
        315,
        360
      ]
      
      setTick(async() => {
        const direction = Game.PlayerPed.Heading;

        // for (let i = 0; i < directions.length; i++) {
        //   if (Math.abs(direction - directions[i])) {
        //     direction = directions[i];
        //     break;
        //   }
        // }

        
        SendNuiMessage(JSON.stringify({
          event: "SET_COMPASS",
          data: {
            rotation: direction
          }
        }))
        await Delay(0)
      });
    }, false);

    RegisterCommand("tpm", () => {
      Game.PlayerPed.Position = new Vector3(1649.11, 3237.66, 40.49);
      Game.PlayerPed.Heading = 280.32;
    }, false);

    RegisterCommand("cuff", async() => {
      const [ped, distance] = await closestPed();
      this.cuffing.init(ped.Handle);
    }, false);

    RegisterCommand("notification", async() => {
      const notification = new Notification("Jew Town", "Wanna buy insurance?", NotificationTypes.Success, false, `<i class="fa-solid fa-hanukiah"></i>`, 3000, () => {
        console.log("START!");
      }, () => {
        console.log("FINISH!");
      });

      await notification.send();
    }, false);
  }

  // Events
  private EVENT_resourceRestarted(resourceName: string): void {
    if (resourceName == GetCurrentResourceName()) {
      emitNet(Events.playerConnected, undefined, true);
    }
  }

  private EVENT_playerLoaded(player: any, spawnInfo: Record<string, any>): void {
    this.player = new Player(player);
    this.spawner.start(spawnInfo);
    this.chatManager.setup();
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

  private EVENT_gunFired(shootersNet: number): void {
    Inform("LX Event (Gunshot)", `${shootersNet} fired their weapon!`);
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

const client = new Client();
client.initialize();
