import { Player } from "./models/player";
import { Command } from "./models/ui/command";
import WebhookMessage from "./models/webhook/webhookMessage";

import { PlayerManager } from "./managers/players";
import { ConnectionsManager } from "./managers/connections";
import * as Database from "./managers/database"
import { LogManager } from "./managers/logging";
import { ChatManager } from "./managers/ui/chat";

import { LogTypes } from "./enums/logTypes";
import { Events } from "../shared/enums/events";

import { Log, Inform, Error, GetHash } from "./utils";
import serverConfig from "../configs/server.json";
import { Ranks } from "../shared/enums/ranks";

export class Server {
  private debugMode: boolean;
  private serverWhitelisted: boolean;
  private maxPlayers: number;

  // Managers
  public playerManager: PlayerManager;
  private connectionsManager: ConnectionsManager;
  public logManager: LogManager;
  public chatManager: ChatManager;

  constructor() {
    this.debugMode = serverConfig.debug;
    this.serverWhitelisted = serverConfig.whitelist;
    this.maxPlayers = GetConvarInt("sv_maxclients", 32);

    // Events
    onNet(Events.resourceStart, async(resourceName: string) => { // Database Connection Processor
      if (GetCurrentResourceName() == resourceName) {
        const [dbStatus, connectionError] = await Database.isConnected();
        if (!dbStatus){ // DB offline or failed connection
          console.log(dbStatus, connectionError)
          if (this.debugMode) Error("Database Connection", `Unable to connect to the database!\n\nError: ${connectionError}`);
          return;
        } else { // DB online, initiate all required managers
          if (this.debugMode) Inform("Database Connection", "Database connection successful!");
          await this.initialize();
        }
      }
    });

    onNet(Events.playerConnected, async(oldId: number, restarted: boolean = false) => {
      await this.playerConnected(oldId, restarted);
    });
  }

  // Get Requests
  public get IsDebugging(): boolean {
    return this.debugMode;
  }

  public get Whitelisted(): boolean {
    return this.serverWhitelisted;
  }

  public get GetMaxPlayers(): number {
    return this.maxPlayers;
  }

  // Methods
  private async initialize(): Promise<void> {
    this.playerManager = new PlayerManager(server);
    this.connectionsManager = new ConnectionsManager(server, this.playerManager);
    this.logManager = new LogManager(server);
    this.chatManager = new ChatManager(server);
    this.registerCommands();

    emitNet(Events.serverStarted, -1);
    Inform("Un-named Project", "Successfully Loaded!");
  }

  private registerCommands(): void {
    // Commands

    new Command("veh", "Spawns you inside a specified vehicle.", [{name: "vehicleModel", help: "The spawn name of the vehicle, you're wanting to spawn."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const vehModel = String(args[0]);
        const myPed = GetPlayerPed(source);
        const myPosition = GetEntityCoords(myPed);
        const vehicle = CreateVehicle(await GetHash(vehModel), myPosition[0], myPosition[1], myPosition[2], GetEntityHeading(myPed), true, false);
        SetPedIntoVehicle(myPed, vehicle, -1);
        SetVehicleNumberPlateText(vehicle, "FWarfare");
      } else {
        Error("Restore Command", "No 1st argument provided!");
      }
    }, Ranks.Admin);

    new Command("delveh", "Deletes the vehicle you're inside.", [{}], false, async(source: string) => {
      const myPed = GetPlayerPed(source);
      const currVeh = GetVehiclePedIsIn(myPed, false);
      if (currVeh > 0) {
        const player = new Player(source);
        const loaded = await player.Load();
        if (loaded) {
          DeleteEntity(currVeh);
          Error("Del Veh Cmd", "Vehicle Deleted");
          // player.TriggerEvent(Events.systemMessage, SystemMessages.Action, "Vehicle Deleted.")
        }
      }
    }, Ranks.Admin);
  }

  // Events
  private async playerConnected(oldId: number, restarted: boolean): Promise<void> {
    const src = global.source;
    let player;
    
    if (!restarted) { // If joined, get our old id and update our data in player manager to new server ID
      await this.playerManager.Update(src, oldId.toString())
      player = await this.playerManager.GetPlayer(src);
    } else { // If restarted resource
      player = new Player(src);
    }

    const loadedPlayer = await player.Load();

    if (loadedPlayer) {
      Log("Connection Manager", `Player data loaded for [${player.GetHandle}]: ${player.GetName}`);
      this.playerManager.Add(player);
      this.chatManager.createChatSuggestions();

      if (!restarted) {
        this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
          color: 4431943,
          title: "Player Connected",
          description: "A player has connected to the server.",
          fields: [
            {
              name: `Player Information:`,
              value: `**Name**: ${player.GetName}\n**Ranks**: ${Ranks[player.GetRank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Identifiers**: ${JSON.stringify(player.identifiers)}`
            },
          ],
          footer: {text: "Unnamed Project", icon_url: "https://i.imgur.com/BXogrnJ.png"}
        }]}));
      }
    }
  }
}

// Managers
export const server = new Server();