import {Player} from "./models/database/player";
import {Ban} from "./models/database/ban";
import WebhookMessage from "./models/webhook/discord/webhookMessage";
import {ClientCallback} from "./models/clientCallback";

import {BanManager} from "./managers/database/bans";
import {PlayerManager} from "./managers/players";
import {ClientCallbackManager} from "./managers/clientCallbacks";
import {ConnectionsManager} from "./managers/connections";
import * as Database from "./managers/database/database"
import {LogManager} from "./managers/logging";
import {ChatManager} from "./managers/ui/chat";

import serverConfig from "../configs/server.json";
import {LogTypes} from "./enums/logTypes";
import {Error, GetHash, Inform, Log} from "./utils";

import {Events} from "../shared/enums/events";
import {Ranks} from "../shared/enums/ranks";
import {EmbedColours} from "../shared/enums/embedColours";
import sharedConfig from "../configs/shared.json";
import {Callbacks} from "../shared/enums/callbacks";
import {Command} from "./models/ui/chat/command";
import {Message} from "../shared/models/ui/chat/message";
import {ChatTypes, SystemTypes} from "../shared/enums/ui/chat/types";

export class Server {
  private debugMode: boolean;
  private serverWhitelisted: boolean;
  private maxPlayers: number;

  // Managers
  public banManager: BanManager;
  public playerManager: PlayerManager;
  private clientCallbackManager: ClientCallbackManager;
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
    this.clientCallbackManager = new ClientCallbackManager(server);
    this.connectionsManager = new ConnectionsManager(server, this.playerManager);
    this.logManager = new LogManager(server);
    this.chatManager = new ChatManager(server);

    // Run Manager Methods
    await this.banManager.loadBans(); // Load all bans from the DB, into the ban manager
    this.banManager.processBans(); // Check if the ban time has passed, if so, update the state and apply that to DB, allowing them to connect
    this.registerCommands();
    this.registerExports();

    emitNet(Events.serverStarted, -1);
    Inform(sharedConfig.serverName, "Successfully Loaded!");
  }

  private registerCommands(): void {
    new Command("veh", "Spawns you inside a specified vehicle.", [{
      name: "vehicleModel",
      help: "The spawn name of the vehicle, you're wanting to spawn."
    }], true, async (source: string, args: any[]) => {
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

    new Command("delveh", "Deletes the vehicle you're inside.", [{}], false, async (source: string) => {
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

    new Command("id", "Returns your server ID.", [{}], false, async (source: string) => {
      const player = await this.playerManager.GetPlayer(source);
      await player.TriggerEvent(Events.sendSystemMessage, new Message("Anyone wanna fuck my wife?", SystemTypes.Advert));

    }, Ranks.User);
  }
  private registerExports(): void {
    global.exports("getRanks", async() => {
      const ranks: Record<string, any> = {};
      for (let i = 0; i < Object.keys(Ranks).length; i++) {
        if (Ranks[i] != undefined) {
          ranks[i] = Ranks[i];
        }
      }

      return ranks;
    });

    global.exports("hasPermission", async(role: number, permission: string) => {
      // console.log("perm", role, permission)
      const rolePerms: string[] = sharedConfig.permissions[Ranks[role]];
      const index = rolePerms.findIndex(rolePermission => rolePermission == permission);
      // console.log("index", index)
      return index != -1;
    });

    global.exports("getPlayer", async(source: string) => {
      return await this.playerManager.GetPlayer(source);
    });

    global.exports("banPlayer", async(playerId: number, hardwareId: string, reason: string, issuedBy?: number) => {
      console.log(playerId, hardwareId, reason, issuedBy);
      const ban = new Ban(playerId, hardwareId, reason, issuedBy);
      if (issuedBy != undefined) {
        ban.Banner = await this.playerManager.GetPlayerFromId(issuedBy);
      }
      await ban.save();
      ban.drop();
    });

    global.exports("anticheatBan", async(playerId: number, hardwareId: string, reason: string, takeScreenshot: boolean, issuedBy?: number) => {
      console.log(playerId, hardwareId, reason, issuedBy);

      const player = await this.playerManager.GetPlayerFromId(playerId);
      if (player) {
        this.clientCallbackManager.Add(new ClientCallback(Callbacks.takeScreenshot, player.GetHandle, {}, async (cbData, passedData) => {
          console.log("client -> server cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
          const ban = new Ban(playerId, hardwareId, reason, issuedBy);
          ban.Logger = LogTypes.Anticheat;

          if (passedData.url) ban.URL = passedData.url;
          if (takeScreenshot) ban.Screenshot = takeScreenshot;
          if (issuedBy != undefined) {
            ban.Banner = await this.playerManager.GetPlayerFromId(issuedBy);
          }

          await ban.save();
        }));
      }
    });
  }

  // Events
  private async playerConnected(oldId: number, restarted: boolean): Promise<void> {
    const src = global.source;
    let player: Player;
    let loadedPlayer;

    if (!restarted) { // If joined, get our old id and update our data in player manager to new server ID
      await this.playerManager.Update(src, oldId.toString())
      player = await this.playerManager.GetPlayer(src);
      loadedPlayer = await player.Load();
    } else { // If restarted resource
      player = new Player(src);
      loadedPlayer = await player.Load();
      this.playerManager.Add(player);
    }

    if (loadedPlayer) {
      Log("Connection Manager", `Player data loaded for [${player.GetHandle}]: ${player.GetName}`);

      // Send player data to client
      emitNet(Events.playerLoaded, player.GetHandle, Object.assign({}, player));
      this.chatManager.createChatSuggestions(player);

      if (!restarted) {
        const discord = await player.GetIdentifier("discord");

        await this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Connected__",
          description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers)}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    }
  }
}

// Managers
export const server = new Server();
