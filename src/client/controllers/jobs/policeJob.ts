import { Audio, Blip, BlipColor, Game, Model, Vector3, World } from "fivem-js";

import { Client } from "../../client";
import { GetClosestPed, getLocation, getZone } from "../../utils";

// Controllers
import { Cuffing } from "./police/cuffing";
import { Grabbing } from './police/grabbing';
import { CommandMenu } from './police/commandMenu';

import { Jobs } from "../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../shared/enums/events/jobs/jobEvents";

interface Call {
  id: number;
  position: Vector3;
  blip: Blip;
}

export class PoliceJob {
  private client: Client

  // 911/311 Blips
  private callBlips: Call[] = [];

  // Controllers
  public cuffing: Cuffing
  public grabbing: Grabbing;
  public commandMenu: CommandMenu;

  constructor(client: Client) {
    this.client = client;

    // Controllers
    this.cuffing = new Cuffing(this.client);
    this.grabbing = new Grabbing(this.client);
    this.commandMenu = new CommandMenu(this.client);

    // Events
    onNet(JobEvents.setupMRAP, this.EVENT_setupMRAP.bind(this));

    onNet(JobEvents.deleteCall, this.EVENT_deleteCall.bind(this));
    
    onNet(JobEvents.start911Call, this.EVENT_start911Call.bind(this));
    onNet(JobEvents.receive911Call, this.EVENT_receive911Call.bind(this));

    onNet(JobEvents.start311Call, this.EVENT_start311Call.bind(this));
    onNet(JobEvents.receive311Call, this.EVENT_receive311Call.bind(this));
  }

  // Methods
  public registerDuty(): void {
    console.log("add")
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
      distance: 3.5
    });
  }

  public registerInteractions(): void {
    emit("astrid_target:client:player", {
      options: [
        {
          event: JobEvents.cuffPlayer,
          type: "server",
          icon: "fas fa-solid fa-handcuffs",
          label: "Cuff Player",
        }
      ],
      distance: 3
    });

    emit("astrid_target:client:player", {
      options: [
        {
          event: JobEvents.uncuffPlayer,
          type: "server",
          icon: "fas fa-solid fa-key",
          label: "Uncuff Player",
        }
      ],
      distance: 3
    });
  }

  public deleteInteractions(): void {
    emit("astrid_target:client:removePlayer", [
      "Cuff Player", "Uncuff Player"
    ]);

    emit("astrid_target:client:removeZone", [
      "sandy_pd_options"
    ]);
  }

  public async init(): Promise<void> {
    await this.cuffing.init();
    this.commandMenu.init();
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
          blip.Scale = 2.0;
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
          blip.Scale = 2.0;
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
}
