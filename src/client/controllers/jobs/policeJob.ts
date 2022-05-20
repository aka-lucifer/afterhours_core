import { Blip, BlipColor, Game, Vector3 } from "fivem-js";

import { Client } from "../../client";

import { Jobs } from "../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../shared/enums/events/jobs/jobEvents";
import { getLocation, getZone } from "../../utils";

export class PoliceJob {
  private client: Client
  private callBlips: Blip[] = [];

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.setupMRAP, this.EVENT_setupMRAP.bind(this));

    onNet(JobEvents.start911Call, this.EVENT_start911Call.bind(this));
    onNet(JobEvents.receive911Call, this.EVENT_receive911Call.bind(this));
    onNet(JobEvents.start311Call, this.EVENT_start311Call.bind(this));


  }

  // Methods
  private registerBoxZones(): void {
    emit("astrid_target:client:addBoxZone", "Sandy PD", new Vector3(1852.24, 3687.0, 34.27), 2.4, 1.4, {
      name: "sandy_pd PD",
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

  public init(): void {
    this.registerBoxZones();
  }

  // Events
  private EVENT_setupMRAP(networkId: number): void {
    const handle = NetToVeh(networkId);
    SetVehicleTyresCanBurst(handle, false);
  }

  private async EVENT_start911Call(callDescription: string): Promise<void> {
    const [street, crossing, postal] = await getLocation(Game.PlayerPed);
    const zone = await getZone(Game.PlayerPed);

    console.log("call 911 from here", street.length, crossing.length, postal.code, zone, callDescription);
    emitNet(JobEvents.send911Call, street, crossing, postal.code, zone, callDescription);
  }

  private EVENT_receive911Call(callersPos: Vector3, callersName: string): void {
    if (this.client.Player.Spawned) {
      if (this.client.Character.isLeoJob() || this.client.Character.isSAFREMSJob() || this.client.Character.Job.name == Jobs.Community) {
        if (this.client.Character.Job.status) {
          const blipHandle = AddBlipForCoord(callersPos.x, callersPos.y, callersPos.z);
          const blip = new Blip(blipHandle);

          blip.Sprite = 817; // Call Icon
          blip.Color = BlipColor.Red;
          blip.IsShortRange = false;
          blip.Scale = 2.0;
          blip.Name = `911 Call | ${callersName}`;

          this.callBlips.push(blip);
          
          setTimeout(() => {
            const blipIndex = this.callBlips.findIndex(blipEntry => blipEntry.Handle == blip.Handle);
            if (blipIndex !== -1) {
              this.callBlips[blipIndex].delete();
              this.callBlips.splice(blipIndex, 1);
            }
          }, 300000); // 5 Minutes

          const blipHandle2 = AddBlipForCoord(callersPos.x + 50, callersPos.y + 90, callersPos.z);
          const blip2 = new Blip(blipHandle2);

          blip2.Sprite = 817; // Call Icon
          blip2.Color = BlipColor.White;
          blip2.IsShortRange = false;
          blip2.Scale = 2.0;
          blip2.Name = `311 Call | ${callersName}`;

          this.callBlips.push(blip2);
          
          setTimeout(() => {
            const blipIndex2 = this.callBlips.findIndex(blipEntry => blipEntry.Handle == blip2.Handle);
            if (blipIndex2 !== -1) {
              this.callBlips[blipIndex2].delete();
              this.callBlips.splice(blipIndex2, 1);
            }
          }, 300000); // 5 Minutes
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
}