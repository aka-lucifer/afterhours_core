import {Client} from "../../client";
import { RegisterNuiCallback, Delay } from "../../utils";

import clientConfig from "../../../configs/client.json";

import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Events } from "../../../shared/enums/events/events";

export class Spawner {
  private client: Client;
  private currentAOP: string;
  private currentPlayers: number;
  private maxPlayers: number;
  private bestPlayer: string;

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.registerCallbacks();

    // Events
    onNet(Events.setupSpawner, this.EVENT_setupSpawner.bind(this));
  }

  // Methods
  public registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseSpawner, async(data, cb) => {
      console.log("TP TO AOP & THEN DISPLAY CHAR UI HERE IF NO CHARACTERS");
      this.client.characters.displayCharacters(false);
      cb("ok");
    });
  }

  public init(): void {
    SetNuiFocus(true, true);
  
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.OpenSpawner,
      data: {
        aop: this.currentAOP,
        players: {
          current: this.currentPlayers,
          max: this.maxPlayers,
          bestPlayer: this.bestPlayer,
        },
        keybinds: clientConfig.spawnInfo.keybinds,
        commands: clientConfig.spawnInfo.commands,
        rules: clientConfig.spawnInfo.rules,
      }
    }));
  }

  // Events
  public EVENT_setupSpawner(currentPlayers: number, maxPlayers: number, bestPlayer: string) {
    this.currentAOP = "Sandy Shores";
    this.currentPlayers = currentPlayers;
    this.maxPlayers = maxPlayers;
    this.bestPlayer = bestPlayer;
  }
}
