
import { Vector3 } from "fivem-js";
import {Client} from "../../client";
import { RegisterNuiCallback } from "../../utils";

import { BoxZone } from "../../helpers/boxZone";
import { PolyZone } from "../../helpers/polyZone";

import clientConfig from "../../../configs/client.json";

import sharedConfig from "../../../configs/shared.json";

import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Events } from "../../../shared/enums/events/events";

export class Spawner {
  private client: Client;
  private currentPlayers: number;
  private maxPlayers: number;
  private bestPlayer: string;

  // AOP Spawn Data
  private spawnPosition: Vector3;
  private spawnHeading: number;
  // private spawnBoxZone: PolyZone;
  private spawnTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.setupSpawner, this.EVENT_setupSpawner.bind(this));
  }

  // Methods
  public async registerCallbacks(): Promise<void> {
    RegisterNuiCallback(NuiCallbacks.CloseSpawner, async(data, cb) => {
      console.log("TP TO AOP & THEN DISPLAY CHAR UI HERE IF NO CHARACTERS");
      // Get random location from AOP positions array
      const aopPosition = this.client.aopManager.AOP.positions[Math.floor(Math.random() * this.client.aopManager.AOP.positions.length)];
      console.log("AOP spawn", aopPosition);

      this.spawnPosition = new Vector3(aopPosition.x, aopPosition.y, aopPosition.z);
      this.spawnHeading = aopPosition.heading;

      // Get random model from AOP configuration.
      const randomModel = sharedConfig.aop.spawnModels[Math.floor(Math.random() * sharedConfig.aop.spawnModels.length)];

      // Spawn into the correct area
      global.exports["spawnmanager"].spawnPlayer({
        x: this.spawnPosition.x,
        y: this.spawnPosition.y,
        z: this.spawnPosition.z,
        heading: this.spawnHeading,
        model: randomModel,
      }); // Ensure player spawns into server (As we have disabled automatic spawning/respawning).

      DoScreenFadeIn(1200);

      // Display character selector UI and enable NUI focus
      this.client.characters.displayCharacters(false);
      this.client.richPresence.Text = "Selecting Character";

      // this.spawnBoxZone = new BoxZone({
      //   box: {
      //     x: this.spawnPosition.x, y: this.spawnPosition.y, z: this.spawnPosition.z, l: 13.2, w: 12.2,
      //   },
      //   options: {
      //     name: "spawn_position",
      //     // heading: ,
      //     debugPoly: false
      //   },
      // }).create();
      cb("ok");
    });
  }

  public async init(): Promise<void> {
    await this.registerCallbacks();
  }

  public requestUI(): void {
    SetNuiFocus(true, true);
    DoScreenFadeOut(500);
  
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.OpenSpawner,
      data: {
        aop: this.client.aopManager.AOP.name,
        players: {
          current: this.currentPlayers,
          max: this.maxPlayers,
          bestPlayer: this.bestPlayer,
        },
        changelog: clientConfig.spawnInfo.changelog,
        keybinds: clientConfig.spawnInfo.keybinds,
        commands: clientConfig.spawnInfo.commands,
        rules: clientConfig.spawnInfo.rules,
      }
    }));
  }

  // Events
  public EVENT_setupSpawner(currentPlayers: number, maxPlayers: number, bestPlayer: string): void {
    this.currentPlayers = currentPlayers;
    this.maxPlayers = maxPlayers;
    this.bestPlayer = bestPlayer;
  }
}
