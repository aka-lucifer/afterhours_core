import { Audio, Blip, BlipColor, Game, Vector3, World } from "fivem-js";

import { Client } from "../../client";
import { Delay, getLocation, getZone, Inform, teleportToCoords } from '../../utils';

// Controllers
import { Cuffing } from "./police/cuffing";
import { Grabbing } from './police/grabbing';
import { CommandMenu } from './police/commandMenu';
import { Garages } from './police/garages';

import { Menu } from "../../models/ui/menu/menu";
import { Notification } from "../../models/ui/notification";

import { Jobs } from "../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../shared/enums/events/jobs/jobEvents";
import { MenuPositions } from "../../../shared/enums/ui/menu/positions";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

import clientConfig from "../../../configs/client.json";

interface Call {
  id: number;
  position: Vector3;
  blip: Blip;
}

export class PoliceJob {
  private client: Client

  // Clocking In/Out
  private madeClockInZones: boolean = false;

  // 911/311 Blips
  private callBlips: Call[] = [];

  // Menus
  private teleportMenu: Menu;

  // Controllers
  public cuffing: Cuffing
  public grabbing: Grabbing;
  public commandMenu: CommandMenu;
  public garages: Garages;

  constructor(client: Client) {
    this.client = client;

    // Controllers
    this.cuffing = new Cuffing(this.client);
    this.grabbing = new Grabbing(this.client);
    this.commandMenu = new CommandMenu(this.client);
    this.garages = new Garages(this.client);

    // Events
    onNet(JobEvents.setupMRAP, this.EVENT_setupMRAP.bind(this));
    onNet(JobEvents.deleteCall, this.EVENT_deleteCall.bind(this));
    onNet(JobEvents.start911Call, this.EVENT_start911Call.bind(this));
    onNet(JobEvents.receive911Call, this.EVENT_receive911Call.bind(this));
    onNet(JobEvents.start311Call, this.EVENT_start311Call.bind(this));
    onNet(JobEvents.receive311Call, this.EVENT_receive311Call.bind(this));
    onNet(JobEvents.takeOffMask, this.EVENT_takeOffMask.bind(this));
    onNet(JobEvents.teleportMenu, this.EVENT_teleportMenu.bind(this));

    Inform("Police | Jobs Controller", "Started!");
  }

  // Getters
  public get ClockZonesCreated(): boolean {
    return this.madeClockInZones;
  }

  // Methods
  private registerExports(): void {
    global.exports("getJob", () => {
      if (this.client.Player.Spawned) {
        return this.client.Character.job.name;
      } else {
        return Jobs.Civilian;
      }
    });

    
    global.exports("onDuty", async() => {
      if (this.client.Player.Spawned) {
        return this.client.Character.job.status;
      } else {
        return false;
      }
    });
  }

  public createClockZones(): void {
    emit("astrid_target:client:addBoxZone", "Sandy PD", new Vector3(1852.24, 3687.0, 34.27), 2.4, 1.4, {
      name: "sandy_pd_options",
      heading: 301,
      debugPoly: false,
      minZ: 32.95,
      maxZ: 36.95
    }, {
      options: [
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-check",
          label: "On Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: true
        },
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-ban",
          label: "Off Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: false
        },
        {
          event: JobEvents.setCallsign,
          icon: "fas fa-solid fa-walkie-talkie",
          label: "Set Callsign",
          job: [Jobs.State, Jobs.County, Jobs.Police]
        }
      ],
      distance: 1
    });

    emit("astrid_target:client:addBoxZone", "Paleto PD", new Vector3(-448.55, 6013.48, 31.72), 4.5, 1.2, {
      name: "paleto_pd_options",
      heading: 45,
      debugPoly: false,
      minZ: 30.72,
      maxZ: 33.0
    }, {
      options: [
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-check",
          label: "On Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: true
        },
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-ban",
          label: "Off Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: false
        },
        {
          event: JobEvents.setCallsign,
          icon: "fas fa-solid fa-walkie-talkie",
          label: "Set Callsign",
          job: [Jobs.State, Jobs.County, Jobs.Police]
        }
      ],
      distance: 1
    });

    emit("astrid_target:client:addBoxZone", "Mission Row PD", new Vector3(442.13, -981.87, 30.69), 2, 2, {
      name: "mrpd_options",
      heading: 0,
      debugPoly: false,
      minZ: 29.69,
      maxZ: 32.2
    }, {
      options: [
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-check",
          label: "On Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: true
        },
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-ban",
          label: "Off Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: false
        },
        {
          event: JobEvents.setCallsign,
          icon: "fas fa-solid fa-walkie-talkie",
          label: "Set Callsign",
          job: [Jobs.State, Jobs.County, Jobs.Police]
        }
      ],
      distance: 1
    });


    emit("astrid_target:client:addBoxZone", "La Mesa PD", new Vector3(835.83, -1289.7, 28.24), 5.2, 1.2, {
      name: "la_mesa_pd_options",
      heading: 0,
      debugPoly: false,
      minZ: 27.23,
      maxZ: 29.8
    }, {
      options: [
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-check",
          label: "On Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: true
        },
        {
          event: JobEvents.toggleDuty,
          icon: "fas fa-solid fa-ban",
          label: "Off Duty",
          job: [Jobs.State, Jobs.County, Jobs.Police],
          state: false
        },
        {
          event: JobEvents.setCallsign,
          icon: "fas fa-solid fa-walkie-talkie",
          label: "Set Callsign",
          job: [Jobs.State, Jobs.County, Jobs.Police]
        }
      ],
      distance: 1
    });

    this.madeClockInZones = true;
  }

  public deleteClockZones(): void {
    emit("astrid_target:client:removeZone", "Sandy PD");
    emit("astrid_target:client:removeZone", "Paleto PD");
    emit("astrid_target:client:removeZone", "Mission Row PD");
    emit("astrid_target:client:removeZone", "La Mesa PD");
  }

  public async init(): Promise<void> {
    await this.cuffing.init();
    this.commandMenu.init();
    this.garages.init();

    // Teleporter Menu
    this.teleportMenu = new Menu("PD Teleporter", GetCurrentResourceName(), MenuPositions.MiddleLeft);
    const tpLocations = clientConfig.controllers.police.teleporterMenu.locations;
    for (let i = 0; i < tpLocations.length; i++) {
      this.teleportMenu.BindButton(tpLocations[i].label, async() => {
        console.log("teleport to", JSON.stringify(tpLocations[i]));

        const teleported = await teleportToCoords(new Vector3(tpLocations[i].x, tpLocations[i].y, tpLocations[i].z));
        if (teleported) {
          Game.PlayerPed.Heading = tpLocations[i].heading;
          const notify = new Notification("Teleporter", `Teleported to ${tpLocations[i].label}.`, NotificationTypes.Success);
          await notify.send();

          await Delay(3000);
          this.client.Teleporting = false;
        }
      });
    }

    this.registerExports();
  }

  public stop(): void {
    // this.cuffing.stop();
    this.commandMenu.stop();
  }

  // Events
  private EVENT_setupMRAP(networkId: number): void {
    const handle = NetToVeh(networkId);
    SetVehicleTyresCanBurst(handle, false);
  }

  private EVENT_deleteCall(id: number): void {
    console.log("try to delete 911 call blip with id", id);
    const callIndex = this.callBlips.findIndex(call => call.id == id);
    if (callIndex !== -1) {
      console.log("call with id found", id, "call index", callIndex);
      this.callBlips[callIndex].blip.delete();
      this.callBlips.splice(callIndex, 1);
    }
  }

  private async EVENT_start911Call(callDescription: string): Promise<void> {
    const [street, crossing, postal] = await getLocation(Game.PlayerPed);
    const zone = await getZone(Game.PlayerPed);

    console.log("call 911 from here", street.length, crossing.length, postal.code, zone, callDescription);
    emitNet(JobEvents.send911Call, street, crossing, postal.code, zone, callDescription);
  }

  private EVENT_receive911Call(id: number, callersPos: Vector3, callersName: string): void {
    if (this.client.Player.Spawned) {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == Jobs.Community) {
        if (this.client.Character.Job.status) {
          const blip = World.createBlip(new Vector3(callersPos.x, callersPos.y, callersPos.z));
          blip.Sprite = 817; // Call Icon
          blip.Color = BlipColor.Red;
          blip.IsShortRange = false;
          blip.Scale = 1.4;
          blip.Name = `911 Call | ${callersName}`;
          Audio.playSoundFrontEnd("Menu_Accept", "Phone_SoundSet_Default");

          this.callBlips.push({
            id: id,
            position: callersPos,
            blip: blip
          });
        }
      }
    }
  }

  private async EVENT_start311Call(callDescription: string): Promise<void> {
    const [street, crossing, postal] = await getLocation(Game.PlayerPed);
    const zone = await getZone(Game.PlayerPed);

    console.log("call 311 from here", street.length, crossing.length, postal.code, zone, callDescription);
    emitNet(JobEvents.send311Call, street, crossing, postal.code, zone, callDescription);
  }
  
  private EVENT_receive311Call(id: number, callersPos: Vector3, callersName: string): void {
    if (this.client.Player.Spawned) {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == Jobs.Community) {
        if (this.client.Character.Job.status) {
          const blip = World.createBlip(new Vector3(callersPos.x, callersPos.y, callersPos.z));
          blip.Sprite = 817; // Call Icon
          blip.Color = BlipColor.White;
          blip.IsShortRange = false;
          blip.Scale = 1.4;
          blip.Name = `311 Call | ${callersName}`;
          Audio.playSoundFrontEnd("Menu_Accept", "Phone_SoundSet_Default");

          this.callBlips.push({
            id: id,
            position: callersPos,
            blip: blip
          });
        }
      }
    }
  }

  private EVENT_takeOffMask(): void {
    const myPed = Game.PlayerPed;
    ClearPedProp(myPed.Handle, 0)

    const myModel = myPed.Model.Hash;
    if (myModel === GetHashKey("mp_m_freemode_01") || myModel === GetHashKey("mp_f_freemode_01")) { // Mp Model
      SetPedComponentVariation(myPed.Handle, 1, 0, 0, 0);
    }
  }

  private async EVENT_teleportMenu(): Promise<void> {
    if (this.teleportMenu !== undefined) await this.teleportMenu.Open();
  }
}
