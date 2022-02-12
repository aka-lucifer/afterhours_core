import {Player} from "./models/database/player";
import {Ban} from "./models/database/ban";
import WebhookMessage from "./models/webhook/discord/webhookMessage";
import {ClientCallback} from "./models/clientCallback";

// Player Control
import {BanManager} from "./managers/database/bans";
import {PlayerManager} from "./managers/players";
import {ConnectionsManager} from "./managers/connections";
// Client Callbacks
import {ClientCallbackManager} from "./managers/clientCallbacks";
import * as Database from "./managers/database/database"
// Logging
import {StaffLogManager} from "./managers/database/staffLogs";
import {LogManager} from "./managers/logging";
// Chat
import {ChatManager} from "./managers/ui/chat";
import {CommandManager} from "./managers/ui/command";

import serverConfig from "../configs/server.json";
import {LogTypes} from "./enums/logTypes";
import {Capitalize, Dist, Error, GetHash, Inform, Log, logCommand} from "./utils";

import {Events} from "../shared/enums/events";
import {Ranks} from "../shared/enums/ranks";
import {EmbedColours} from "../shared/enums/embedColours";
import sharedConfig from "../configs/shared.json";
import {Callbacks} from "../shared/enums/callbacks";
import {Command} from "./models/ui/chat/command";
import {Message} from "../shared/models/ui/chat/message";
import {SystemTypes} from "../shared/enums/ui/types";
import {Playtime} from "./models/database/playtime";

export class Server {
  // Debug Data
  private readonly debugMode: boolean;
  private readonly serverWhitelisted: boolean;
  private readonly maxPlayers: number;

  // Player Control
  public banManager: BanManager;
  public playerManager: PlayerManager;
  public connectionsManager: ConnectionsManager;

  // Client Callbacks
  private clientCallbackManager: ClientCallbackManager;

  // Logging
  public staffLogManager: StaffLogManager;
  public logManager: LogManager;

  // Chat
  public commandManager: CommandManager;
  public chatManager: ChatManager;

  constructor() {
    this.debugMode = serverConfig.debug;
    this.serverWhitelisted = serverConfig.whitelist;
    this.maxPlayers = GetConvarInt("sv_maxclients", 32);

    // Events
    onNet(Events.resourceStart, this.EVENT_resourceStarted.bind(this));
    onNet(Events.playerConnected, this.EVENT_playerConnected.bind(this));
    onNet(Events.logDeath, this.EVENT_playerKilled.bind(this));
    onNet(Events.requestPlayers, this.EVENT_refreshPlayers.bind(this));
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
    // Player Controller
    this.banManager = new BanManager(server);
    this.playerManager = new PlayerManager(server);
    this.connectionsManager = new ConnectionsManager(server, this.playerManager);

    // Client Callbacks
    this.clientCallbackManager = new ClientCallbackManager(server);

    // Logging
    this.staffLogManager = new StaffLogManager(server);

    this.logManager = new LogManager(server);

    // Chat
    this.commandManager = new CommandManager(server);
    this.chatManager = new ChatManager(server);
    this.chatManager.init();

    // Run Manager Methods
    await this.banManager.loadBans(); // Load all bans from the DB, into the ban manager
    this.banManager.processBans(); // Check if the ban time has passed, if so, update the state and apply that to DB, allowing them to connect

    await this.staffLogManager.loadLogs(); // Loads all the server logs

    this.registerCommands();
    this.registerExports();

    Inform(sharedConfig.serverName, "Successfully Loaded!");
  }

  private registerCommands(): void {
    RegisterCommand("test_chat", async(source: string) => {
      const player = await this.playerManager.GetPlayer(source);
      await player.TriggerEvent(Events.sendSystemMessage, new Message("im a fat bitch!", SystemTypes.Me), player.GetName);
    }, false);

    new Command("veh", "Spawns you inside a specified vehicle.", [{
      name: "vehicleModel",
      help: "The spawn name of the vehicle, you're wanting to spawn."
    }], true, async (source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.playerManager.GetPlayer(source);
        const vehModel = String(args[0]);
        const myPed = GetPlayerPed(source);
        const myPosition = GetEntityCoords(myPed);
        const vehicle = CreateVehicle(await GetHash(vehModel), myPosition[0], myPosition[1], myPosition[2], GetEntityHeading(myPed), true, false);
        SetPedIntoVehicle(myPed, vehicle, -1);
        SetVehicleNumberPlateText(vehicle, "Astrid");
        await logCommand("/veh", player, "");
      } else {
        Error("Restore Command", "No 1st argument provided!");
      }
    }, Ranks.Admin);

    new Command("dv", "Deletes the vehicle you're inside.", [{}], false, async (source: string) => {
      const myPed = GetPlayerPed(source);
      const currVeh = GetVehiclePedIsIn(myPed, false);
      if (currVeh > 0) {
        const player = new Player(source);
        const loaded = await player.Load();
        if (loaded) {
          DeleteEntity(currVeh);
          await logCommand("/delveh", player);
          Error("Del Veh Cmd", "Vehicle Deleted");
          // player.TriggerEvent(Events.systemMessage, SystemMessages.Action, "Vehicle Deleted.")
        }
      }
    }, Ranks.Admin);

    new Command("me", "Returns your server ID.", [{name: "content", help: "The content of your /me message."}], true, async (source: string, args: any[]) => {
      const player = await this.playerManager.GetPlayer(source);
      const messageContents = args.join(" ");
      if (messageContents.length > 0) {
        await player.TriggerEvent(Events.sendSystemMessage, new Message(messageContents, SystemTypes.Me), player.GetName);
        await logCommand("/me", player, messageContents);
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No message provided!", SystemTypes.Error));
      }
    }, Ranks.User);

    new Command("vehclear", "Clear the vehicles in the area", [], false, () => {
      emitNet(Events.clearWorldVehs, -1);
    }, Ranks.Admin);
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
  private async EVENT_resourceStarted(resourceName: string): Promise<void> { // Database Connection Processor
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
  }

  private async EVENT_playerConnected(oldId: number, restarted: boolean = false): Promise<void> {
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
      setTimeout(() => { // Need a 0ms timeout otherwise the suggestions are sent over before the chat manager is initialized
        emitNet(Events.playerLoaded, player.GetHandle, Object.assign({}, player));
        this.commandManager.createChatSuggestions(player);
      }, 0);

      const discord = await player.GetIdentifier("discord");

      if (!restarted) {
        const rejoined = this.connectionsManager.disconnectedPlayers.findIndex(tempPlayer => tempPlayer.license == player.GetIdentifier("license") || tempPlayer.ip == player.GetIdentifier("ip") || tempPlayer.hardwareId == player.HardwareId);

        if (rejoined != -1) { // If the player hasn't left the server
          if (this.connectionsManager.disconnectedPlayers[rejoined].name != player.GetName) {
            await this.logManager.Send(LogTypes.Anticheat, new WebhookMessage({
              username: "Anticheat Logs", embeds: [{
                color: EmbedColours.Red,
                title: "__Name Change Detected__",
                description: `A player has connected to the server with a changed name.\n\n**Old Name**: ${this.connectionsManager.disconnectedPlayers[rejoined].name}\n**New Name**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers)}`,
                footer: {
                  text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  icon_url: sharedConfig.serverLogo
                }
              }]
            }));
            this.connectionsManager.disconnectedPlayers.splice(rejoined, 1);
          } else {
            await this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Player Connected__",
                description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers)}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]}));
          }
        } else {
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

  private async EVENT_playerKilled(data: Record<string, any>): Promise<void> {
    const src = source;
    const player = await this.playerManager.GetPlayer(src);

    if (data.attacker != -1) {
      const killer = await this.playerManager.GetPlayer(data.attacker);
      const weaponData = sharedConfig.weapons[data.weapon];

      if (!data.inVeh) {
        const killDistance = Dist(player.Position(), killer.Position(), false);
        emitNet(Events.sendSystemMessage, -1, new Message(`${player.GetName} killed ${killer.GetName} with ${weaponData.label}, from ${killDistance.toFixed(1)}m`, SystemTypes.Kill));
      }

      const victimsDisc = await player.GetIdentifier("discord");
      const killersDisc = await killer.GetIdentifier("discord");
      await this.logManager.Send(LogTypes.Kill, new WebhookMessage({
        username: "Kill Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Killed__",
          description: `A player has been killed.\n\n**Victim**: ${player.GetName}\n**Killer**: ${killer.GetName}\n**Weapon**: ${weaponData.label}\n**Cause**: ${Capitalize(weaponData.reason)}\n**Victims Discord**: ${victimsDisc != "Unknown" ? `<@${victimsDisc}>` : victimsDisc}\n**Killers Discord**: ${killersDisc != "Unknown" ? `<@${killersDisc}>` : killersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    } else {
      const playersDisc = await player.GetIdentifier("discord");

      await this.logManager.Send(LogTypes.Kill, new WebhookMessage({
        username: "Death Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Died__",
          description: `A player has died.\n\n**Player**: ${player.GetName}\n**Discord**: ${playersDisc != "Unknown" ? `<@${playersDisc}>` : playersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    }
  }

  private async EVENT_refreshPlayers(): Promise<void> {
    const player = await this.playerManager.GetPlayer(source);
    const svPlayers = this.playerManager.GetPlayers;
    for (let a = 0; a < svPlayers.length; a++) {
      svPlayers[a].RefreshPing();
      const currPlaytime = await svPlayers[a].CurrentPlaytime();
      svPlayers[a].formattedPlaytime = await new Playtime(currPlaytime).FormatTime();
    }

    await player.TriggerEvent(Events.receivePlayers, this.maxPlayers, Object.assign({}, svPlayers));
  }
}

// Managers
export const server = new Server();
