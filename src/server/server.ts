import { Player } from './models/database/player';
import { Ban } from './models/database/ban';
import WebhookMessage from './models/webhook/discord/webhookMessage';
import { ClientCallback } from './models/clientCallback';
import { Command } from './models/ui/chat/command';

// [Managers] Server Data
import { StaffManager } from './managers/staff';

// [Managers] Player Control
import { BanManager } from './managers/database/bans';
import { KickManager } from './managers/database/kicks';
import { WarnManager } from './managers/database/warnings';
import { CommendManager } from './managers/database/commends';
import { ConnectedPlayerManager } from './managers/connectedPlayers';
import { ConnectionsManager } from './managers/connections';

// [Managers] UI
import { CharacterManager } from './managers/characters';
import { CharVehicleManager } from './managers/ui/charVehicles';
import { ChatManager } from './managers/ui/chat';
import { CommandManager } from './managers/ui/command';

// [Managers] Jobs
import { JobManager } from './managers/job';

// [Managers] Vehicle Control
import { VehicleManager } from './managers/vehicles';

// [Managers] Weapon Control
import { WeaponsManager } from './managers/weapons';

// [Managers] Syncing
import { TimeManager } from './managers/sync/time';
import { WeatherManager } from './managers/sync/weather';
import { AOPManager, AOPStates } from './managers/sync/aop';

// [Managers] Client Callbacks
import { ClientCallbackManager } from './managers/clientCallbacks';
import * as Database from './managers/database/database';

// [Managers] Logging
import { StaffLogManager } from './managers/database/staffLogs';
import { LogManager } from './managers/logging';

// [Controllers] UI
import { BugReporting } from './controllers/ui/bugReporting';

// [Controllers] Death
import { Death } from './controllers/death';

import { LogTypes } from './enums/logging';
import { Capitalize, Dist, Error, GetHash, Inform, Log, logCommand } from './utils';

import serverConfig from '../configs/server.json';
import sharedConfig from '../configs/shared.json';

import { Events } from '../shared/enums/events/events';
import { Ranks } from '../shared/enums/ranks';
import { EmbedColours } from '../shared/enums/logging/embedColours';
import { Callbacks } from '../shared/enums/events/callbacks';
import { Message } from '../shared/models/ui/chat/message';
import { SystemTypes } from '../shared/enums/ui/chat/types';
import { PlayerManager } from './managers/database/players';
import { ErrorCodes } from '../shared/enums/logging/errors';
import { Weapon } from '../shared/interfaces/weapon';
import { concatArgs } from '../shared/utils';


export class Server {
  // Debug Data
  private readonly debugMode: boolean;
  private readonly serverWhitelisted: boolean;
  private developmentMode: boolean;
  private readonly maxPlayers: number;

  // [Managers] Server Data
  public staffManager: StaffManager;

  // [Managers] Player Control
  public banManager: BanManager;
  public kickManager: KickManager;
  public warnManager: WarnManager;
  public commendManager: CommendManager;
  public playerManager: PlayerManager;
  public connectedPlayerManager: ConnectedPlayerManager;
  public connectionsManager: ConnectionsManager;

  // [Managers] UI
  public characterManager: CharacterManager;
  public charVehicleManager: CharVehicleManager;
  public commandManager: CommandManager;
  public chatManager: ChatManager;
  
  // [Managers] Jobs
  public jobManager: JobManager;

  // [Managers] Vehicle Control
  public vehicleManager: VehicleManager;

  // [Managers] Weapon Control
  public weaponManager: WeaponsManager;

  // [Managers] Syncing
  public timeManager: TimeManager;
  public weatherManager: WeatherManager;
  private aopManager: AOPManager;

  // [Managers] Client Callbacks
  public clientCallbackManager: ClientCallbackManager;

  // [Managers] Logging
  public staffLogManager: StaffLogManager;
  public logManager: LogManager;

  // [Controllers | UI] Bug Reporting
  private bugReporting: BugReporting;

  // [Controllers] Death
  private death: Death;

  constructor() {
    this.debugMode = serverConfig.debug;
    this.serverWhitelisted = serverConfig.whitelist;
    this.developmentMode = (GetConvar('development_server', 'false') === "true");
    this.maxPlayers = GetConvarInt("sv_maxclients", 32);

    // Events
    onNet(Events.resourceStart, this.EVENT_resourceStarted.bind(this));
    onNet(Events.playerJoined, this.EVENT_playerJoined.bind(this));
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

  public get Developing(): boolean {
    return this.developmentMode;
  }

  public get GetMaxPlayers(): number {
    return this.maxPlayers;
  }

  // Methods
  private async initialize(): Promise<void> {
    // [Managers] Server Data
    this.staffManager = new StaffManager(server);

    // [Managers] Player Controller
    this.banManager = new BanManager(server);
    this.kickManager = new KickManager(server);
    this.warnManager = new WarnManager(server);
    this.commendManager = new CommendManager(server);
    this.playerManager = new PlayerManager(server);
    this.connectedPlayerManager = new ConnectedPlayerManager(server);
    this.connectionsManager = new ConnectionsManager(server);

    // [Managers] UI
    this.characterManager = new CharacterManager(server);
    this.charVehicleManager = new CharVehicleManager(server);
    this.commandManager = new CommandManager(server);
    this.chatManager = new ChatManager(server);

    // [Managers] Jobs
    this.jobManager = new JobManager(server);

    // [Managers] Vehicle Control
    this.vehicleManager = new VehicleManager(server);

    // [Managers] Weapon Control
    this.weaponManager = new WeaponsManager(server);

    // [Managers] Syncing
    this.timeManager = new TimeManager(server);
    this.weatherManager = new WeatherManager(server);
    this.aopManager = new AOPManager(server);

    // [Managers] Client Callbacks
    this.clientCallbackManager = new ClientCallbackManager(server);

    // [Managers] Logging
    this.staffLogManager = new StaffLogManager(server);
    this.logManager = new LogManager(server);

    // [Controllers | UI] Bug Reporting
    this.bugReporting = new BugReporting(server);

    // [Controllers] Death
    this.death = new Death(server);
    this.death.init();

    // Initiate Managers
    await this.banManager.loadBans(); // Load all bans from the DB, into the ban manager
    this.banManager.processBans(); // Check if the ban time has passed, if so, update the state and apply that to DB, allowing them to connect

    await this.kickManager.loadKicks(); // Load all kicks from the DB, into the kick manager

    await this.warnManager.loadWarnings(); // Load all warnings from the DB, into the warn manager

    await this.commendManager.loadCommends(); // Load all warnings from the DB, into the warn manager

    await this.playerManager.init(); // Load all players from the DB, into the player manager
    await this.connectedPlayerManager.init();

    await this.staffLogManager.loadLogs(); // Loads all the server logs

    this.chatManager.init(); // Register all commands
    
    this.staffManager.init();

    // Load below now as it has to be loaded after the chat & commands, otherwise commands wont work
    this.characterManager.init();
    await this.charVehicleManager.init();
    await this.vehicleManager.init();
    this.jobManager.init();

    // Initiate Controllers
    this.bugReporting.init();

    // Register Components
    this.registerCommands();
    this.registerRCONCommands();
    this.registerExports();

    // Start Syncings
    await this.timeManager.init();
    this.timeManager.startTime();

    await this.weatherManager.init();

    this.aopManager.init();

    // Disables Population Density & Variety
    SetConvarReplicated("profile_gfxCityDensity", "0");
    SetConvarReplicated("profile_gfxDistScale", "0");

    Inform(sharedConfig.serverName, "Successfully Loaded!");
  }

  private registerCommands(): void {
    new Command("veh", "Spawns you inside a specified vehicle.", [{
        name: "vehicleModel",
        help: "The spawn name of the vehicle, you're wanting to spawn."
      }], true, async (source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.connectedPlayerManager.GetPlayer(source);
        if (player) {
          if (player.Spawned) {
            const myPed = GetPlayerPed(source);
            const currVeh = GetVehiclePedIsIn(myPed, false)

            if (currVeh != 0) {
              DeleteEntity(currVeh);
            }

            const vehModel = String(args[0]);
            const myPosition = GetEntityCoords(myPed);
            const vehicle = CreateVehicle(GetHash(vehModel), myPosition[0], myPosition[1], myPosition[2], GetEntityHeading(myPed), true, false);
            SetPedIntoVehicle(myPed, vehicle, -1);
            SetVehicleNumberPlateText(vehicle, "Astrid");
            await logCommand("/veh", player, "");
          }
        }
      } else {
        Error("Restore Command", "No 1st argument provided!");
      }
    }, Ranks.Admin);

    new Command("dv", "Deletes the vehicle you're inside.", [{}], false, async (source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const myPed = GetPlayerPed(source);
          const currVeh = GetVehiclePedIsIn(myPed, false);
          if (currVeh > 0) {
            DeleteEntity(currVeh);
            await player.TriggerEvent(Events.sendSystemMessage, new Message("Vehicle Deleted", SystemTypes.Success));
            Error("Del Veh Cmd", "Vehicle Deleted");
            await logCommand("/delveh", player);
          }
        }
      }
    }, Ranks.User);

    new Command("dev", "Toggle development mode", [], false, async(source: string) => {
      this.developmentMode = !this.developmentMode;
      SetConvar("development_server", this.developmentMode.toString());
      emitNet(Events.changeDevMode, -1, this.developmentMode);
      Inform("Development Mode", `Set development mode to ${Capitalize(this.developmentMode.toString())}`);
    }, Ranks.Developer);

    new Command("afk", "Toggle AFK mode", [], false, async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You've gone AFK", SystemTypes.Interaction));
          await player.TriggerEvent(Events.setAFK);
        }
      }
    }, Ranks.Developer);

    new Command("report", "Report a player.", [{name: "server_id", help: "The server ID of the player you're reporting."}, {name: "reason", help: "The reason you're reporting the player."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        if (args[1]) {
          const player = await this.connectedPlayerManager.GetPlayer(source);
          if (player) {
            if (player.Spawned) {
              const reportedPlayer = await this.connectedPlayerManager.GetPlayer(args[0]);
              if (reportedPlayer) {
                const reportReason = concatArgs(1, args);

                // Insert report into database (make a manager later on maybe, could be used in in-game admin panel)
                const inserted = await Database.SendQuery("INSERT INTO `player_reports` (`player_id`, `reason`, `reported_by`) VALUES (:id, :reason, :reportedBy)", {
                  id: reportedPlayer.Id,
                  reason: reportReason,
                  reportedBy: player.Id
                });

                console.log("insertedData", inserted);

                if (inserted.meta.affectedRows > 0 && inserted.meta.insertId > 0) {
                  // Inform the player their report has been submitted
                  await player.TriggerEvent(Events.sendSystemMessage, new Message(`You have reported ^3${reportedPlayer.GetName}^0, for ^3${reportReason}^0.`, SystemTypes.Admin));

                  // Inform all in server staff with a chat message and sound
                  const svPlayers = this.connectedPlayerManager.GetPlayers;
                  for (let i = 0; i < svPlayers.length; i++) {
                    if (svPlayers[i].Spawned) {
                      if (svPlayers[i].Rank >= Ranks.Moderator) {
                        await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`A server report has been filled out on ^3${reportedPlayer.GetName}^0, for ^3${reportReason}^0, by ^3${player.GetName}^0.`, SystemTypes.Admin));
                        await svPlayers[i].TriggerEvent(Events.soundFrontEnd, "Menu_Accept", "Phone_SoundSet_Default");
                      }
                    }
                  }

                  // Log player report
                  const playersDiscord = await reportedPlayer.GetIdentifier("discord");
                  const reportersDiscord = await player.GetIdentifier("discord");

                  await this.logManager.Send(LogTypes.Report, new WebhookMessage({
                    username: "Player Reporting", embeds: [{
                      color: EmbedColours.Green,
                      title: "__Player Reported__",
                      description: `A player has been reported.\n\n**Players Id**: ${reportedPlayer.Id}\n**Players Name**: ${reportedPlayer.GetName}\n**Players Rank**: ${Ranks[reportedPlayer.Rank]}\n**Reporters Id**: ${player.Id}\n**Reporters Name**: ${player.GetName}\n**Reporters Rank**: ${Ranks[player.Rank]}\n**Report Reason**: ${reportReason}\n**Players Discord**: ${playersDiscord != "Unknown" ? `<@${playersDiscord}>` : playersDiscord}\n**Reporters Discord**: ${reportersDiscord != "Unknown" ? `<@${reportersDiscord}>` : reportersDiscord}.`,
                      footer: {
                        text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                        icon_url: sharedConfig.serverLogo
                      }
                    }]
                  }));
                }
              } else {
                await player.TriggerEvent(Events.sendSystemMessage, new Message("No player found with that server ID!", SystemTypes.Error));
              }
            }
          }
        }
      }
    }, Ranks.Developer);
  }

  private registerRCONCommands(): void {
    RegisterCommand("dev", () => {
      this.developmentMode = !this.developmentMode;
      SetConvar("development_server", this.developmentMode.toString());
      emitNet(Events.changeDevMode, -1, this.developmentMode);
      Inform("Development Mode", `Set development mode to ${Capitalize(this.developmentMode.toString())}`);
    }, false);
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
      return await this.connectedPlayerManager.GetPlayer(source);
    });

    global.exports("getCharacter", async(playerId: number) => {
      const player = await this.connectedPlayerManager.GetPlayerFromId(playerId)
      if (player) {
        return await this.characterManager.Get(player);
      } else {
        console.log("No player found, whilst using getCharacter export!");
        return null;
      }
    });

    global.exports("isBanned", async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      return await player.isBanned();
    });

    global.exports("banPlayer", async(playerId: number, hardwareId: string, reason: string, issuedBy?: number) => {
      // console.log(playerId, hardwareId, reason, issuedBy);
      const ban = new Ban(playerId, hardwareId, reason, issuedBy);
      if (issuedBy != undefined) {
        ban.Banner = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
      }
      await ban.save();
      ban.drop();
    });

    global.exports("anticheatBan", async(playerId: number, hardwareId: string, reason: string, takeScreenshot: boolean, issuedBy?: number) => {
      // console.log(playerId, hardwareId, reason, issuedBy);

      const player = await this.connectedPlayerManager.GetPlayerFromId(playerId);
      if (player) {
        this.clientCallbackManager.Add(new ClientCallback(Callbacks.takeScreenshot, player.Handle, {}, async (cbData, passedData) => {
          // console.log("client -> server cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
          const ban = new Ban(playerId, hardwareId, reason, issuedBy);
          ban.Logger = LogTypes.Anticheat;

          if (passedData.url) ban.URL = passedData.url;
          if (takeScreenshot) ban.Screenshot = takeScreenshot;
          if (issuedBy != undefined) {
            ban.Banner = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
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

  private async EVENT_playerJoined(oldId: string) {
    const src = source;
    const player = await this.connectedPlayerManager.GetPlayer(oldId);
    if (player) {

      // Update our connected ID to our established net server ID
      player.Handle = src;

      const discord = await player.GetIdentifier("discord");
      const rejoined = this.connectionsManager.disconnectedPlayers.findIndex(tempPlayer => tempPlayer.license == player.GetIdentifier("license") || tempPlayer.ip == player.GetIdentifier("ip") || tempPlayer.hardwareId == player.HardwareId);
  
      if (rejoined != -1) { // If the player hasn't left the server
        if (this.connectionsManager.disconnectedPlayers[rejoined].name != player.GetName) {
          await this.logManager.Send(LogTypes.Anticheat, new WebhookMessage({
            username: "Anticheat Logs", embeds: [{
              color: EmbedColours.Red,
              title: "__Name Change Detected__",
              description: `A player has connected to the server with a changed name.\n\n**Old Name**: ${this.connectionsManager.disconnectedPlayers[rejoined].name}\n**New Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
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
            description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      } else {
        await this.logManager.Send(LogTypes.Connection, new WebhookMessage({username: "Connection Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Player Connected__",
          description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    } else {
      console.log("unable to find player, on event playerJoined!");
    }
  }

  private async EVENT_playerConnected(): Promise<void> {
    const src = source;
    let player: Player;
    let existed = false;

    if (await this.connectedPlayerManager.playerConnected(src)) { // If connected to server
      player = await this.connectedPlayerManager.GetPlayer(src);
      existed = true;
    } else { // If restarted resource
      player = new Player(src);
    }

    if (player) {
      const loadedPlayer = await player.Load();
      if (loadedPlayer) {
        if (!existed) this.connectedPlayerManager.Add(player);
        Log("Connection Manager", `Player data loaded for [${player.Handle}]: ${player.GetName}`);

        // Sync weather & time
        await this.timeManager.sync(player);
        await this.weatherManager.sync(player);

        // Sync chat data
        await this.chatManager.generateTypes(player);

        // Sync Characters
        const loadedChars = await player.getCharacters();
        if (loadedChars) {
          await player.TriggerEvent(Events.receiveCharacters, player.characters);
        }

        await player.TriggerEvent(Events.syncAOP, this.aopManager.AOP, AOPStates.None);

        // Sync spawner data
        if (!this.developmentMode) {
          await player.TriggerEvent(Events.setupSpawner, this.connectedPlayerManager.GetPlayers.length, this.GetMaxPlayers, await this.playerManager.getBestPlayer())
        }

        // Disables Population Density & Variety
        SetConvarReplicated("profile_gfxCityDensity", "0");
        SetConvarReplicated("profile_gfxDistScale", "0");

        // Sync Player data
        await player.TriggerEvent(Events.playerLoaded,  Object.assign({}, player));
      } else {
        console.log("error loading player load method!");
      }
    } else {
      console.log("error loading player!");
    }
  }

  private async EVENT_playerKilled(data: Record<string, any>): Promise<void> {
    const player = await this.connectedPlayerManager.GetPlayer(source);

    if (data.attacker != -1) {
      if (data.attacker !== player.Handle) {
        const killer = await this.connectedPlayerManager.GetPlayer(data.attacker);
        const weaponData: Weapon = sharedConfig.weapons[data.weapon];

        if (weaponData !== undefined) {
          if (!data.inVeh && weaponData.type == "weapon" || weaponData.type == "veh_weapon") {
            const killDistance = Dist(player.Position, killer.Position, false);
            emitNet(Events.sendSystemMessage, -1, new Message(`${killer.GetName} killed ${player.GetName} with ${weaponData.label}, from ${killDistance.toFixed(1)}m`, SystemTypes.Kill));
          }

          const victimsDisc = await player.GetIdentifier("discord");
          const killersDisc = await killer.GetIdentifier("discord");
          await this.logManager.Send(LogTypes.Kill, new WebhookMessage({
            username: "Kill Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Player Killed__",
              description: `A player has been killed.\n\n**Victim**: ${player.GetName}\n**Killer**: ${killer.GetName}\n**Weapon**: ${weaponData.label}\n**Cause**: ${Capitalize(weaponData.reason)}\n**Victims Discord**: ${victimsDisc != "Unknown" ? `<@${victimsDisc}>` : victimsDisc}\n**Killers Discord**: ${killersDisc != "Unknown" ? `<@${killersDisc}>` : killersDisc}`,
              footer: {
                text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                icon_url: sharedConfig.serverLogo
              }
            }]
          }));
        } else {
          await this.logManager.Send(LogTypes.Kill, new WebhookMessage({
            username: "Kill Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Player Killed__",
              description: `Weapon not found (${JSON.stringify(data, null, 4)}) | Error Code: ${ErrorCodes.WeaponNotFound}\n\n**If you see this, contact <@276069255559118859>!**`,
              footer: {
                text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                icon_url: sharedConfig.serverLogo
              }
            }]
          }));
        }
      }
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
    const player = await this.connectedPlayerManager.GetPlayer(source);
    const svPlayers = this.connectedPlayerManager.GetPlayers;

    for (let a = 0; a < svPlayers.length; a++) {
      svPlayers[a].RefreshPing();
      // const currPlaytime = await svPlayers[a].CurrentPlaytime();
      // svPlayers[a].formattedPlaytime = await new Playtime(currPlaytime).FormatTime();
      svPlayers[a].formattedPlaytime = "DISABLED_FOR_TESTING";
    }

    await player.TriggerEvent(Events.receivePlayers, this.maxPlayers, Object.assign({}, svPlayers));
  }
}

// Managers
export const server = new Server();
