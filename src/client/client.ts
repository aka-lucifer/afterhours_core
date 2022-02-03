import { Game } from "fivem-js"

import { ServerCallback} from "./models/serverCallback";

import { RichPresence } from "./managers/richPresence";
import {ServerCallbackManager} from "./managers/serverCallbacks";

import Config from "../configs/client.json";
import { Inform } from "./utils";

import { Events } from "../shared/enums/events";
import {Callbacks} from "../shared/enums/callbacks";

let takingScreenshot = false;

export class Client {
  private debugging: boolean;
  private initialSpawn: boolean;
  private richPresenceData: Record<string, any>;

  // Managers
  private richPresence: RichPresence;
  private serverCallbackManager: ServerCallbackManager;

  constructor() {
    this.debugging = Config.debug;
    this.richPresenceData = Config.richPresence;
    this.initialSpawn = true;
    
    on(Events.resourceStart, (resourceName: string) => {
      if (resourceName == GetCurrentResourceName()) {
        emitNet(Events.playerConnected, undefined, true);
      }
    });

    onNet(Events.serverStarted, () => {
      this.initialize();
    });

    // Screenshot Client CB
    onNet(Callbacks.takeScreenshot, (data) => {
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
    });
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
    Inform("Un-named Project", "Successfully Loaded!");

    setTimeout(() => {
      this.serverCallbackManager.Add(new ServerCallback(Callbacks.testClientCB, {}, (cbData, passedData) => {
        console.log("server -> client cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
      }))
    }, 0);
  }
}

const client = new Client();
