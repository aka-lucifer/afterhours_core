import { Player } from "./models/player";
import { RichPresence } from "./managers/richPresence";
import { Events } from "../shared/enums/events";
import Config from "../configs/client.json";
import { Inform } from "./utils";

// Managers Declaration
export let richPresence;

export class Client {
  private debugging: boolean;
  private initialSpawn: boolean;
  private richPresenceData: Record<string, any>; 
  private player: Player;

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
    })
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
    richPresence = new RichPresence(client);
    Inform("Un-named Project", "Successfully Loaded!");
  }
}

const client = new Client();