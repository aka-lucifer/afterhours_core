import { Game } from "fivem-js"

import { ServerCallback} from "./models/serverCallback";
import { Player } from "./models/player";

import { RichPresence } from "./managers/richPresence";
import { ServerCallbackManager } from "./managers/serverCallbacks";
import { ChatManager } from "./managers/ui/chat";
import { CuffingStuff } from "./cuffing";

import Config from "../configs/client.json";
import { closestPed, Inform } from "./utils";

import { Events } from "../shared/enums/events";
import {Callbacks} from "../shared/enums/callbacks";
import sharedConfig from "../configs/shared.json";

let takingScreenshot = false;

export class Client {
  private debugging: boolean;
  private initialSpawn: boolean;
  private richPresenceData: Record<string, any>;

  // Player Data
  public player: Player;

  // Managers
  private richPresence: RichPresence;
  public serverCallbackManager: ServerCallbackManager;
  private chatManager: ChatManager;
  private cuffing: CuffingStuff;

  constructor() {
    this.debugging = Config.debug;
    this.richPresenceData = Config.richPresence;
    this.initialSpawn = true;
    
    // Events
    on(Events.resourceStart, this.EVENT_resourceRestarted.bind(this));
    onNet(Events.playerLoaded, this.EVENT_playerLoaded.bind(this));
    onNet(Events.serverStarted, this.initialize.bind(this));

    // Callbacks
    onNet(Callbacks.takeScreenshot, this.CALLBACK_screenshot.bind(this));

    RegisterCommand("cuff", async() => {
      const [ped, distance] = await closestPed();
      this.cuffing.init(ped.Handle);
    }, false);
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
  private initialize(): void {
    this.richPresence = new RichPresence(client);
    this.serverCallbackManager = new ServerCallbackManager(client);
    
    // Chat
    this.chatManager = new ChatManager(client);
    this.chatManager.init();

    this.cuffing = new CuffingStuff();

    Inform(sharedConfig.serverName, "Successfully Loaded!");
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
