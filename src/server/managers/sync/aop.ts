import { Server } from "../../server";
import { Inform, randomBetween } from "../../utils";

import { Command } from "../../models/ui/chat/command";

import sharedConfig from "../../../configs/shared.json";
import { Ranks } from "../../../shared/enums/ranks";
import { Events } from "../../../shared/enums/events/events";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { Callbacks } from '../../../shared/enums/events/callbacks';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';

interface AOPLayout {
  name: string,
  automaticCycling: boolean,
  playerMax?: number,
  positions: {x: number, y: number, z: number, heading: number}[]
}

export enum AOPStates {
  None,
  Updated,
  Automatic
}

export class AOPManager {
  private server: Server;

  // AOP Cycling
  private readonly aopLocations: any[] = sharedConfig.aop.locations;
  private playerCount: number = 8;
  private cycleInterval: NodeJS.Timeout = undefined;
  private aopCycling: boolean;
  private aopTick: number = undefined;

  // AOP Data
  private aopIndex: number;
  private currentAOP: AOPLayout;

  constructor(server: Server) {
    this.server = server;

    // Set AOP cycling convar into boolean variable
    this.aopCycling = (GetConvar('player_based_aop', 'false') === "true");
    
    // Events
    onNet(Events.setCycling, this.EVENT_setCycling.bind(this));

    // Callbacks
    onNet(Callbacks.setAOP, this.CALLBACK_setAOP.bind(this));

    // RegisterCommand("players_add", () => {
    //   this.playerCount = 17;
    //   console.log("players set to", this.playerCount);
    // }, false);

    // RegisterCommand("players_remove", () => {
    //   this.playerCount = 8;
    //   console.log("players set to", this.playerCount);
    // }, false);
  }

  // Getters
  public get AOP(): AOPLayout {
    return this.currentAOP;
  }

  public get Cycling(): boolean {
    return this.aopCycling;
  }

  // Methods
  private registerCommands(): void {
    new Command("aop", "Opens the AOP menu", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.aopMenu);
        }
      }
    }, Ranks.Admin);
  }

  private async randomAOP(): Promise<AOPLayout> {
    if (this.aopCycling) {
      let foundAop = false;
      let aopResult;

      while (!foundAop) {
        const randomIndex = randomBetween(0, Object.keys(this.aopLocations).length - 1);
        const result: AOPLayout = this.aopLocations[randomIndex];

        if (this.currentAOP !== undefined) {
          if (result.automaticCycling && result.name != this.currentAOP.name) {
            this.aopIndex = randomIndex;
            aopResult = result;
            foundAop = true;
          }
        } else {
          if (result.automaticCycling) {
            this.aopIndex = randomIndex;
            aopResult = result;
            foundAop = true;
          }
        }
      }

      return aopResult;
    } else {
      let foundAop = false;
      let aopResult;

      while (!foundAop) {
        const randomIndex = randomBetween(0, Object.keys(this.aopLocations).length - 1);
        const result: AOPLayout = this.aopLocations[randomIndex];

        if (this.currentAOP !== undefined) {
          if (result.name != this.currentAOP.name) {
            this.aopIndex = randomIndex;
            aopResult = result;
            foundAop = true;
          }
        } else {
          this.aopIndex = randomIndex;
          aopResult = result;
          foundAop = true;
        }
      }

      return aopResult;
    }
  }

  public init(): void {
    this.registerCommands();

    // Get first AOP
    this.aopIndex = 1;
    this.currentAOP = this.aopLocations[this.aopIndex]; // Sandy Shores
    console.log(`Found AOP: ${this.currentAOP.name}`);

    // Start cycling based on player count!
    this.startCycling();
  }

  private async nextAutomaticAOP(): Promise<number> {
    let foundNext = false;
    let aopIndex;

    while (!foundNext) {
      aopIndex = this.aopIndex + 1;
      if (aopIndex > Object.keys(this.aopLocations).length - 1) {
        aopIndex = 0;
      }

      let newAOP: AOPLayout = this.aopLocations[aopIndex];

      // If not found a automatic AOP
      if (!newAOP.automaticCycling) {
        aopIndex = this.aopIndex = this.aopIndex + 1;
        newAOP = this.aopLocations[aopIndex];
      } else if (newAOP.name == this.currentAOP.name) {
        aopIndex = this.aopIndex = this.aopIndex + 1;
        newAOP = this.aopLocations[aopIndex];
      } else {
        foundNext = true;
      }
    }

    return aopIndex;
  }

  private async prevAutomaticAOP(): Promise<number> {
    let foundPrev = false;
    let aopIndex;

    while (!foundPrev) {
      aopIndex = this.aopIndex - 1;
      if (aopIndex < 0) {
        aopIndex = Object.keys(this.aopLocations).length - 1;
      }

      let newAOP: AOPLayout = this.aopLocations[aopIndex];

      // If not found a automatic AOP
      if (!newAOP.automaticCycling) {
        aopIndex = this.aopIndex = this.aopIndex - 1;
        newAOP = this.aopLocations[aopIndex];
      } else {
        foundPrev = true;
      }
    }

    return aopIndex;
  }

  private closestCycleAOP(): number {
    let closest = 1; // 1 for sandy shores
    for (let i = 0; i < this.aopLocations.length; i++) {
      if (Math.abs(this.aopLocations[i].playerMax - this.playerCount) < Math.abs(this.aopLocations[closest].playerMax - this.playerCount)) {
        closest = i;
      }
    }
    return closest;
  }

  private startCycling(): void {
    this.cycleInterval = setInterval(async() => {
      if (this.aopCycling) {
        // Inform("Player Checker", `Player Count: ${this.server.connectedPlayerManager.GetPlayers.length} | Current AOP: ${JSON.stringify(this.currentAOP)}`);
        this.playerCount = this.server.connectedPlayerManager.GetPlayers.length;

        // -- If our current player count, is greater than our current max allowed
        if (this.playerCount > this.currentAOP.playerMax) {
          const oldAOP = this.currentAOP;
          
          // Get the new AOP Index & AOP
          if ((this.aopIndex + 1) > Object.keys(this.aopLocations).length - 1) {

            // Set back to sandy shores
            this.aopIndex = 1;
            this.currentAOP = this.aopLocations[this.aopIndex];

            this.playerCount = this.currentAOP.playerMax - 2;
          } else {
            this.aopIndex = await this.nextAutomaticAOP();
            this.currentAOP = this.aopLocations[this.aopIndex];

            this.playerCount = this.currentAOP.playerMax - 2;
          }

          Inform("Next AOP", `Changing AOP from (${oldAOP.name}) to (${this.currentAOP.name}) | Index: ${this.aopIndex} | AOP: ${JSON.stringify(this.currentAOP)} | PLAYERS - ${this.playerCount}`)

          // sync new AOP to everyone
        } else {
          // If not on first automatic AOP entry, as we have nothing to subtract to
          if (this.aopIndex > 1) {
            console.log("one!");
            
            // If our current player count, is equal to or less than the prev AOP max amount

            const prevAOP = await this.prevAutomaticAOP();
            console.log("two!", this.playerCount, this.aopLocations[prevAOP].playerMax);

            if (this.playerCount <= this.aopLocations[prevAOP].playerMax) {
              console.log("Change it bby!");
              const oldAOP = this.currentAOP;
              if ((this.aopIndex - 1) < 0) {
                this.aopIndex = Object.keys(this.aopLocations).length - 1; // Remove 1 from it, as 0 is the first value in TS array
                this.currentAOP = this.aopLocations[this.aopIndex];
              } else {
                this.aopIndex = await this.prevAutomaticAOP();
                this.currentAOP = this.aopLocations[this.aopIndex];

                this.playerCount = this.currentAOP.playerMax - 2;
              }
              
              Inform("Previous AOP", `Changing AOP from (${oldAOP.name}) to (${this.currentAOP.name}) | Index: ${this.aopIndex} | AOP: ${JSON.stringify(this.currentAOP)}`)

              // sync new AOP to everyone
            }
          }
        }
      } else {
        console.log("aop cycling, clear interval, until reenabled!");
      }
    }, 1000);
  }

  // Events
  public async CALLBACK_setAOP(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        if (player.Rank >= Ranks.Admin) {
          const newAOP: AOPLayout = data.newAOP;
          if (newAOP.name != this.currentAOP.name) {
            this.aopCycling = false; // Disable AOP cycling
            // console.log("disabled aop cycling bool", this.aopCycling);

            // Clear interval and set back to null
            clearInterval(this.cycleInterval);
            this.cycleInterval = undefined;

            // Set the current AOP to the passed AOP, and sync it to every client.
            this.currentAOP = newAOP;

            const svPlayers = this.server.connectedPlayerManager.GetPlayers;
            for (let i = 0; i < svPlayers.length; i++) {
              if (svPlayers[i].Spawned) await svPlayers[i].TriggerEvent(Events.syncAOP, this.currentAOP, AOPStates.Automatic);
            }

            await player.TriggerEvent(Events.receiveServerCB, true, data);

            // console.log("updated AOP here!", this.currentAOP);
            // log who changed it here
          } else {
            await player.Notify("AOP", "You can't change the AOP to the same AOP!", NotificationTypes.Error);
            await player.TriggerEvent(Events.receiveServerCB, false, data);
          }
        }
      }
    }
  }

  public async EVENT_setCycling(newState: boolean): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      if (player.Spawned) {
        if (player.Rank >= Ranks.Admin) {
          // console.log("has perm!", newState, this.aopCycling);
          this.aopCycling = newState;
          
          if (!this.aopCycling) {
            // console.log("aop cycling disabled, clear interval, until re-enabled!");
            clearInterval(this.cycleInterval);
            this.cycleInterval = undefined;
            await player.Notify("AOP", "Automatic AOP disabled!", NotificationTypes.Error);
          } else {
            // Get correct cycling AOP & sync to all clients
            this.aopIndex = this.closestCycleAOP();
            this.currentAOP = this.aopLocations[this.aopIndex];

            const svPlayers = this.server.connectedPlayerManager.GetPlayers;
            for (let i = 0; i < svPlayers.length; i++) {
              if (svPlayers[i].Spawned) await svPlayers[i].TriggerEvent(Events.syncAOP, this.currentAOP, AOPStates.Automatic);
            }

            if (this.cycleInterval === undefined) {
              // console.log("create aop cycle interval!");
              this.startCycling();
              await player.Notify("AOP", "Automatic AOP enabled!", NotificationTypes.Success);
            }
          }

          const svPlayers = this.server.connectedPlayerManager.GetPlayers;
          for (let i = 0; i < svPlayers.length; i++) {
            if (svPlayers[i].Spawned) await svPlayers[i].TriggerEvent(Events.syncAOPCycling, this.aopCycling);
          }
        }
      }
    }
  }
}
