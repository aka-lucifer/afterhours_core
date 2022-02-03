import {Player} from "./models/database/player";
import {Ban} from "./models/database/ban";
import {Command} from "./models/ui/command";
import WebhookMessage from "./models/webhook/discord/webhookMessage";
import Screenshoter from "./models/webhook/screenshot/screenshoter";
import { ClientCallback } from "./models/clientCallback";

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
import {Callbacks} from "../shared/enums/callbacks";
import {Ranks} from "../shared/enums/ranks";
import {EmbedColours} from "../shared/enums/embedColours";
import sharedConfig from "../configs/shared.json";

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

    // Server CB Test
    onNet(Callbacks.testClientCB, (data) => {
      data.serverId = source;
      emitNet(Events.receiveServerCB, source, false, data);
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

    new Command("screenshot", "no_descript", [], false, (source: string) => {
      this.clientCallbackManager.Add(new ClientCallback(Callbacks.takeScreenshot, source, {}, async(cbData, passedData) => {
        console.log("client -> server cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
        const message = new WebhookMessage({
          username: "Screenshot Test", embeds: [{
            color: EmbedColours.Orange,
            title: "__Screenshot Test Title__",
            description: "screenshot test description",
            image: {
              url: passedData.url
            },
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]
        });
        await server.logManager.Send(LogTypes.Anticheat, message);
      }));
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
    let player;
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
      // this.playerManager.Add(player);
      this.chatManager.createChatSuggestions();

      if (!restarted) {
        const discord = await player.GetIdentifier("discord");
        const discString = discord != "Unknown" ? `<@${discord}>` : "Not found";
        console.log("discord", discord, discString);

        await this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Connected__",
          description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${await player.GetIdentifier("discord") != "Unknown" ? `<@${await player.GetIdentifier("discord")}>` : "Not found"}\n**Identifiers**: ${JSON.stringify(player.identifiers)}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    }
  }
}

// Managers
export const server = new Server();
