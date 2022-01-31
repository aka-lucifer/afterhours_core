import { Player } from "./models/database/player";
import { Command } from "./models/ui/command";
import WebhookMessage from "./models/webhook/webhookMessage";

import { BanManager } from "./managers/database/bans";
import { PlayerManager } from "./managers/players";
import { ConnectionsManager } from "./managers/connections";
import * as Database from "./managers/database/database"
import { LogManager } from "./managers/logging";
import { ChatManager } from "./managers/ui/chat";

import { LogTypes } from "./enums/logTypes";
import { Events } from "../shared/enums/events";

import { Log, Inform, Error, GetHash } from "./utils";
import serverConfig from "../configs/server.json";
import { Ranks } from "../shared/enums/ranks";
import {Ban} from "./models/database/ban";
import {EmbedColours} from "../shared/enums/embedColours";

export class Server {
  private debugMode: boolean;
  private serverWhitelisted: boolean;
  private maxPlayers: number;

  // Managers
  public banManager: BanManager;
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
          if (this.debugMode) Error("Database Connection", `Unable to connect to the database! | ${connectionError}`);
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
    // Setup Managers
    this.banManager = new BanManager(server);
    this.playerManager = new PlayerManager(server);
    this.connectionsManager = new ConnectionsManager(server, this.playerManager);
    this.logManager = new LogManager(server);
    this.chatManager = new ChatManager(server);

    // Run Manager Methods
    await this.banManager.loadBans(); // Load all bans from the DB, into the ban manager
    this.banManager.processBans(); // Check if the ban time has passed, if so, update the state and apply that to DB, allowing them to connect
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

    new Command("id", "Returns your server ID.", [{}], false, async(source: string) => {
      console.log(source);
    }, Ranks.User);

    new Command("chat_colours", "my nan", [], false, (source: string) => {
      emitNet(Events.sendMessage, source, {
        color: [255, 0, 0],
        multiline: true,
        args: ['^3[System]^0:', "OOPSIE THERE IS AN ERROR!"]
      });
    }, Ranks.User);

    new Command("banreason", "Bans the specified player", [{name: "server_id", help: "The server ID of the player"}, {name: "reason", help: "Reason for banning the person"}], true, async(source: string, args: any[]) => {
      const bannedPlayer = await this.playerManager.GetPlayer(args[0]);
      if (bannedPlayer) {
        const myPlayer = await this.playerManager.GetPlayer(source);
        Log("Ban Command", `Ban the player [${bannedPlayer.GetHandle}]: ${bannedPlayer.GetName} for ${args[1]}, until im gay`);
        const banData = new Ban(bannedPlayer.id, bannedPlayer.HardwareId, args[1], myPlayer.id);
        banData.Banner = myPlayer;
        await banData.save();
      }
    }, Ranks.Admin);
    //
    // new Command("bantime", "Bans the specified player", [{name: "server_id", help: "The server ID of the player"}, {name: "time", help: "The time to ban them in seconds!"}], true, async(source: string, args: any[]) => {
    //   const bannedPlayer = await this.playerManager.GetPlayer(args[0]);
    //   if (bannedPlayer) {
    //     const myPlayer = await this.playerManager.GetPlayer(source);
    //     const currTime = new Date();
    //     const currSeconds = currTime.getSeconds();
    //     currTime.setSeconds(currSeconds + args[1]);
    //     Log("Ban Command", `Ban the player [${bannedPlayer.GetHandle}]: ${bannedPlayer.GetName} for no reason specified, until ${currTime.toUTCString()}`);
    //     const banData = new Ban(bannedPlayer.id, bannedPlayer.HardwareId,"no reason specified", myPlayer.id, currTime);
    //     banData.Banner = myPlayer;
    //     await banData.save();
    //     // banData.drop();
    //   }
    // }, Ranks.Admin);
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
        await this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Connected__",
          description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n\n**Rank**: ${Ranks[player.GetRank]}\n\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n\n**Whitelisted**: ${await player.Whitelisted()}\n\n**Identifiers**: ${JSON.stringify(player.identifiers)}`,
          footer: {text: "Unnamed Project", icon_url: "https://i.imgur.com/BXogrnJ.png"}
        }]}));
      }
    }
  }
}

// Managers
export const server = new Server();
