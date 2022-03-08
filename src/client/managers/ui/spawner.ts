import {Client} from "../../client";
import { RegisterNuiCallback, Delay } from "../../utils";

import clientConfig from "../../../configs/client.json";

import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Events } from "../../../shared/enums/events/events";

export class Spawner {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    this.registerCallbacks();
  }

  // Methods
  public registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseSpawner, async(data, cb) => {
      SetNuiFocus(false, false);
      console.log("TP TO AOP & THEN DISPLAY CHAR UI HERE IF NO CHARACTERS");
      this.client.characters.EVENT_displayCharacters();
      cb("ok");
    });
  }

  public start(spawnInfo: Record<string, any>): void {
    setTimeout(async() => {
      SetNuiFocus(true, true);
  
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.OpenSpawner,
        data: {
          aop: "Sandy Shores",
          players: {
            current: spawnInfo.current,
            max: spawnInfo.max,
            bestPlayer: spawnInfo.bestPlayer,
          },
          keybinds: clientConfig.spawnInfo.keybinds,
          commands: clientConfig.spawnInfo.commands,
          rules: clientConfig.spawnInfo.rules,
        }
      }));
    }, 500);
  }
}
