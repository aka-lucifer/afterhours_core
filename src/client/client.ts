import {Game, Vector3, VehicleSeat, World} from "fivem-js"

import {Player} from "./models/player";
import {Notification} from "./models/ui/notification";
import {NotificationTypes} from "./enums/ui/notifications/types";

// Server Data
import {RichPresence} from "./managers/richPresence";
import {ServerCallbackManager} from "./managers/serverCallbacks";

// UI
import {ChatManager} from "./managers/ui/chat";
import {Scoreboard} from "./managers/ui/scoreboard";
import {Warnings} from "./managers/ui/warnings";

// Jobs
import {CuffingStuff} from "./cuffing";

import Config from "../configs/client.json";
import {closestPed, Inform} from "./utils";

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
  private chatManager: ChatManager;
  private scoreboard: Scoreboard;
  private warnings: Warnings;

  private cuffing: CuffingStuff;

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
    this.chatManager = new ChatManager(client);
    this.chatManager.init();
    this.scoreboard = new Scoreboard(client);
    this.warnings = new Warnings(client);

    this.cuffing = new CuffingStuff();
    Inform(sharedConfig.serverName, "Successfully Loaded!");

    RegisterCommand("pistol", () => {
      const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
      if (currWeapon == Weapons.Pistol) {
        console.log(`Pistol Data: ${JSON.stringify(sharedConfig.weapons[currWeapon])}`)
      }
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

  private EVENT_playerLoaded(player: any): void {
    this.player = new Player(player);
    console.log("Event Triggered (playerLoaded)", this.player);
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
    console.log("STEP 1");
    if (IsPedAPlayer(damagedEntity) && damagedEntity == Game.PlayerPed.Handle) {
      console.log("STEP 2");
      if (IsPedAPlayer(attackingEntity)) {
        console.log("STEP 3");
        emitNet(Events.logDeath, {
          type: GetEntityType(attackingEntity),
          inVeh: IsPedInAnyVehicle(attackingEntity, false) && GetPedInVehicleSeat(GetVehiclePedIsIn(attackingEntity, false), VehicleSeat.Driver),
          weapon: weaponHash,
          attacker: GetPlayerServerId(NetworkGetPlayerIndexFromPed(attackingEntity))
        });
        console.log("STEP 4");
      } else {
        console.log("STEP 5");
        if (attackingEntity == -1) {
          console.log("STEP 6");
          emitNet(Events.logDeath, {
            attacker: attackingEntity
          });
          console.log("STEP 7");
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
