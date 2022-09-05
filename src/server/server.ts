import {Player} from './models/database/player';
import {Ban} from './models/database/ban';
import {Kick} from './models/database/kick';
import WebhookMessage from './models/webhook/discord/webhookMessage';
import {ClientCallback} from './models/clientCallback';
import {Command} from './models/ui/chat/command';

// [Managers] Server Data
import {StaffManager} from './managers/staff';

// [Managers] Player Control
import {BanManager} from './managers/database/bans';
import {KickManager} from './managers/database/kicks';
import {WarnManager} from './managers/database/warnings';
import {CommendManager} from './managers/database/commends';
import {ConnectedPlayerManager} from './managers/connectedPlayers';
import {ConnectionsManager} from './managers/connections';

// [Managers] UI
import {CharacterManager} from './managers/characters';
import {CharVehicleManager} from './managers/ui/charVehicles';
import {ChatManager} from './managers/ui/chat';
import {CommandManager} from './managers/ui/command';

// [Managers] Jobs
import {JobManager} from './managers/job';

// [Managers] Vehicle Control
import {VehicleManager} from './managers/vehicles';

// [Managers] Weapon Control
import {WeaponsManager} from './managers/weapons';

// [Managers] Syncing
import {TimeManager} from './managers/sync/time';
import {WeatherManager} from './managers/sync/weather';
import {AOPManager, AOPStates} from './managers/sync/aop';

// [Managers] Client Callbacks
import {ClientCallbackManager} from './managers/clientCallbacks';
import * as Database from './managers/database/database';

// [Managers] Logging
import {StaffLogManager} from './managers/database/staffLogs';
import {LogManager} from './managers/logging';

// [Controllers] UI
import {BugReporting} from './controllers/ui/bugReporting';
import {Priority} from './controllers/ui/priority';
import {Scoreboard} from './controllers/ui/scoreboard';

// [Controllers] Civilian
import {Kidnapping} from './controllers/civilian/kidnapping';
import {Carrying} from './controllers/civilian/carrying';
import {Gagging} from './controllers/civilian/gagging';
import {ModelBlacklist} from './controllers/civilian/modelBlacklist';

// [Controllers] Normal
import {Death} from './controllers/death';

import {LogTypes} from './enums/logging';
import {Capitalize, Delay, Dist, Error, getClosestVehicle, GetHash, Inform, Log, logCommand} from './utils';

import serverConfig from '../configs/server.json';
import sharedConfig from '../configs/shared.json';

import {Events} from '../shared/enums/events/events';
import {Ranks} from '../shared/enums/ranks';
import {EmbedColours} from '../shared/enums/logging/embedColours';
import {Callbacks} from '../shared/enums/events/callbacks';
import {Message} from '../shared/models/ui/chat/message';
import {SystemTypes} from '../shared/enums/ui/chat/types';
import {PlayerManager} from './managers/database/players';
import {ErrorCodes} from '../shared/enums/logging/errors';
import {Weapon} from '../shared/interfaces/weapon';
import {concatArgs} from '../shared/utils';
import {NotificationTypes} from '../shared/enums/ui/notifications/types';

export class Server {
  // Debug Data
  private readonly debugMode: boolean;
  private readonly serverWhitelisted: boolean;
  private developmentMode: boolean;
  private maxPlayers: number;

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

  // [Controllers | UI]
  private bugReporting: BugReporting;
  public priority: Priority;
  private scoreboard: Scoreboard;

  // [Controllers] Civilian

  private kidnapping: Kidnapping;
  public carrying: Carrying;
  private gagging: Gagging;
  private modelBlacklist: ModelBlacklist;

  // [Controllers] Normal
  private death: Death;

  constructor() {
    const encryptionLua = LoadResourceFile(GetCurrentResourceName(), "server/security.lua");
    if (encryptionLua !== null) { // IF AUTHORIZED START ASSETS
      this.debugMode = serverConfig.debug;
      this.serverWhitelisted = serverConfig.whitelist;
  
      // Events
      onNet(Events.resourceStart, this.EVENT_resourceStarted.bind(this));
      onNet(Events.resourceStop, this.EVENT_resourceStopped.bind(this));
      onNet(Events.playerJoined, this.EVENT_playerJoined.bind(this));
      onNet(Events.playerConnected, this.EVENT_playerConnected.bind(this));
      onNet(Events.logDeath, this.EVENT_playerKilled.bind(this));
    } else {
      Error("FATAL ERROR", "File (server/security.lua) not found, unable to initiate core!")
    }
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
  private getConvars(): void {
    this.developmentMode = (GetConvar('development_server', 'false') === "true");
    this.maxPlayers = GetConvarInt("sv_maxclients", 32);
  }

  private async initialize(): Promise<void> {
    // Get server convars, as we are now ready
    this.getConvars();

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
    this.priority = new Priority(server);
    this.scoreboard = new Scoreboard(server);

    // [Controllers] Civilian
    this.kidnapping = new Kidnapping(server);
    this.carrying = new Carrying(server);
    this.gagging = new Gagging(server);
    this.modelBlacklist = new ModelBlacklist(server);

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
    this.priority.init();

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

    new Command("dv", "Deletes the vehicle you're inside/near.", [], false, async (source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const myPed = GetPlayerPed(source);
          const currVeh = GetVehiclePedIsIn(myPed, false);
          if (currVeh > 0) {
            DeleteEntity(currVeh);
            await player.TriggerEvent(Events.sendSystemMessage, new Message("Current vehicle deleted.", SystemTypes.Success));
            Error("Del Veh Cmd", "Vehicle Deleted");
            await logCommand("/dv", player);
          } else {
            const [closestVeh, vehDistance] = await getClosestVehicle(player);
            console.log("closest vehicle data", closestVeh, vehDistance, closestVeh.Position);

            if (vehDistance <= 5.0) {
              DeleteEntity(closestVeh.Handle);
              await player.TriggerEvent(Events.sendSystemMessage, new Message("Vehicle deleted.", SystemTypes.Success));
              Error("Del Veh Cmd", "Vehicle Deleted");
              await logCommand("/dv", player);
            } else {
              await player.Notify("Vehicle Deleter", "No vehicle found!", NotificationTypes.Error);
            }
          }
        }
      }
    }, Ranks.User);

    new Command("dev", "Toggle development mode", [], false, async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          this.developmentMode = !this.developmentMode;
          SetConvar("development_server", this.developmentMode.toString());
          emitNet(Events.changeDevMode, -1, this.developmentMode);

          const devLabel = Capitalize(this.developmentMode.toString());
          Inform("Development Mode", `Set development mode to ${devLabel}`);

          if (this.developmentMode) {
            await player.Notify("Development", `Server development mode enabled.`, NotificationTypes.Info);
          } else {
            await player.Notify("Development", `Server development mode disabled.`, NotificationTypes.Error);
          }
        }
      }
    }, Ranks.Developer);

    new Command("afk", "Toggle AFK mode", [], false, async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("You've gone AFK", SystemTypes.Interaction));
          await player.TriggerEvent(Events.setAFK);
        }
      }
    }, Ranks.Moderator);

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

    new Command("discord", "See the servers Discord URL", [], false, async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Rank >= Ranks.Moderator) {
          await emitNet(Events.sendSystemMessage, -1, new Message(`Make sure to join our Discord - ^3${sharedConfig.serverDiscord}^0.`, SystemTypes.Admin));
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message(`Make sure to join our Discord - ^3${sharedConfig.serverDiscord}^0.`, SystemTypes.Admin));
        }
      }
    }, Ranks.User);

    new Command("e", "Play an emote", [{name: "emote_name", help: "The name of the emote you want to play"}], true, async(source: string, args: any[]) => {
      const player = await this.connectedPlayerManager.GetPlayer(source);
      if (player) {
        await player.TriggerEvent(Events.playEmote, args);
      }
    }, Ranks.User);
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
      if (sharedConfig.permissions[Ranks[role]] !== undefined) { // If permissions found
        const rolePerms: string[] = sharedConfig.permissions[Ranks[role]];
        const index = rolePerms.findIndex(rolePermission => rolePermission == permission);
        return index !== -1;
      } else {
        return false;
      }
    });

    global.exports("getPlayer", async(source: string) => {
      return await this.connectedPlayerManager.GetPlayer(source);
    });

    global.exports("getCharacter", async(source: string) => {
      const player = await this.connectedPlayerManager.GetPlayer(source)
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
        ban.IssuedBy = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
      }
      await ban.save();
      ban.drop();
    });

    global.exports("anticheatBan", async(playerHandle: number, hardwareId: string, reason: string, takeScreenshot: boolean, issuedBy?: number) => {
      // console.log(playerId, hardwareId, reason, issuedBy);

      const player = await this.connectedPlayerManager.GetPlayer(playerHandle.toString());
      if (player) {
        this.clientCallbackManager.Add(new ClientCallback(Callbacks.takeScreenshot, player.Handle, {}, async (cbData, passedData) => {
          console.log("client -> sersver cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
          const ban = new Ban(playerHandle, hardwareId, reason, issuedBy);
          ban.Receiver = player;
          ban.Logger = LogTypes.Anticheat;

          if (passedData.url) ban.URL = passedData.url;
          if (issuedBy != undefined) {
            ban.IssuedBy = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
          }

          await ban.save();
          ban.drop();
        }));
      }
    });

    global.exports("kickPlayer", async(playerId: number, reason: string, anticheatKick: boolean, issuedBy?: number) => {
      // console.log(playerId, reason, issuedBy);
      if (anticheatKick) {
        const player = await this.connectedPlayerManager.GetPlayerFromId(playerId);
        if (player) {
          this.clientCallbackManager.Add(new ClientCallback(Callbacks.takeScreenshot, player.Handle, {}, async (cbData, passedData) => {
            console.log("client -> server cb", `(data: ${cbData} | ${JSON.stringify(passedData)})`);
            const kick = new Kick(playerId, reason, issuedBy);

            kick.Logger = LogTypes.Anticheat;

            if (passedData.url) kick.URL = passedData.url;
            if (issuedBy != undefined) {
              kick.IssuedBy = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
            }

            kick.systemKick = true;

            await kick.save();
            // kick.drop();
          }));
        }
      } else {
        const player = await this.connectedPlayerManager.GetPlayerFromId(playerId);
        if (player) {
          const kick = new Kick(playerId, reason, issuedBy);
          kick.Receiver = player;

          if (issuedBy !== undefined) {
            kick.IssuedBy = await this.connectedPlayerManager.GetPlayerFromId(issuedBy);
          }

          await kick.save();
          kick.drop();
        }
      }
    });

    // TYPE (SELECT, INSERT, UPDATE, DELETE)
    global.exports("sqlQuery", async(type: string, query: string, data: Record<string, any>) => {
      console.log("type", type, query, data);
      if (type === "DROP") {
        const queryData = await Database.SendQuery(query, data);
        return queryData.error === null || queryData.error === undefined;
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

  private async EVENT_resourceStopped(resourceName: string): Promise<void> {
    if (resourceName !== GetCurrentResourceName()) {
      if (resourceName === "astrid_metas" || resourceName == "astrid_notify") {
        await Delay(1000); // Wait until resource has stopped
        StartResource(resourceName); // Start it back up
      }
    }
  }

  private async EVENT_playerJoined() {
    const player = new Player(source.toString());
    const loadedPlayer = await player.Load();

    if (loadedPlayer) {
      player.Connected = true;
      await this.connectedPlayerManager.Add(player);
      const discord = await player.GetIdentifier("discord");
      
      // Joined Server Message
      const playtime = await player.GetPlaytime.FormatTime();
      const [trustscore, bans, kicks, warnings, commends] = await player.getTrustscore();
      
      emitNet(Events.sendSystemMessage, -1, new Message(`[^3${player.FormattedRank}^0] - ^3${player.GetName} ^0has joined ^3${sharedConfig.serverName} ^0(^2${trustscore}% Trustscore ^0| 
        ^1${bans} ${bans > 1 || bans < 1 ? "Bans" : "Ban"} ^0| 
        ^4${kicks} ${kicks > 1 || kicks < 1 ? "Kicks" : "Kick"} ^0| 
        ^3${warnings} ${warnings > 1 || warnings < 1 ? "Warnings" : "Warning"} ^0| 
        ^5${commends} ${commends > 1 || commends < 1 ? "Commends" : "Commend"} ^0 | 
        ^9Playtime - ${playtime}^0)`,
      SystemTypes.Admin));

      // Changed Username Logic
      const rejoined = this.connectionsManager.disconnectedPlayers.findIndex(tempPlayer => tempPlayer.license == player.GetIdentifier("license") || tempPlayer.ip == player.GetIdentifier("ip") || tempPlayer.hardwareId == player.HardwareId);
      if (rejoined !== -1) { // If the player hasn't left the server
        if (player.Rank < Ranks.Moderator) {
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
            this.connectionsManager.disconnectedPlayers.splice(rejoined, 1); // Remove entry from array
          } else {
            await this.logManager.Send(LogTypes.Connection, new WebhookMessage({
              username: "Connection Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Player Connected__",
                description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
                footer: {
                  text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
                  icon_url: sharedConfig.serverLogo
                }
              }]
            }));
          }
        }
      } else {
        await this.logManager.Send(LogTypes.Connection, new WebhookMessage({
          username: "Connection Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Player Connected__",
            description: `A player has connected to the server.\n\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
            footer: {
              text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`,
              icon_url: sharedConfig.serverLogo
            }
          }]
        }));
      }
    }
  }

  private async EVENT_playerConnected(): Promise<void> {
    const src = source.toString();
    let player: Player;
    let entryExists = false;

    if (await this.connectedPlayerManager.playerConnected(src)) { // If connected to server
      player = await this.connectedPlayerManager.GetPlayer(src);
      entryExists = true;
    } else { // If restarted resource
      player = new Player(src);
      await player.Load();
    }

    if (player) {
      if (!entryExists) await this.connectedPlayerManager.Add(player); // If no entry found (add player data into the connected player manager | if restarted resource)
      Log("Connection Manager", `Player data loaded for [${player.Handle}]: ${player.GetName}`);

      // Sync weather & time
      await this.timeManager.sync(player);
      await this.weatherManager.sync(player);

      // Sync priority & active units
      this.priority.sync();

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
        await player.TriggerEvent(Events.setupSpawner, this.connectedPlayerManager.GetPlayers.length, this.maxPlayers, await this.playerManager.getBestPlayer())
      }

      // Disables Population Density & Variety
      SetConvarReplicated("profile_gfxCityDensity", "0");
      SetConvarReplicated("profile_gfxDistScale", "0");

      // Sync Player data
      await player.TriggerEvent(Events.playerLoaded,  Object.assign({}, player), this.developmentMode, this.maxPlayers);
    } else {
      console.log("error loading player!");
    }
  }

  private async EVENT_playerKilled(data: Record<string, any>): Promise<void> {
    const player = await this.connectedPlayerManager.GetPlayer(source.toString());

    if (data.attacker != -1) {
      if (data.attacker !== parseInt(player.Handle)) {
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
}

// Managers
export const server = new Server();
