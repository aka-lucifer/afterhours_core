import { Vector3, VehicleClass } from "fivem-js";

import { Server } from "../../../server";
import { Delay } from "../../../utils";

import { Jobs } from "../../../../shared/enums/jobs/jobs";
import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";

interface ActiveUnit {
  netId: string;
  coords: Vector3;
  heading: number;
  firstName: string;
  lastName: string;
  job: string;
  callsign: string;
  inVeh: boolean;
  sirenOn?: boolean
}

export class JobBlips {
  private server: Server;

  // Tick Data
  private blipTick: number = undefined;
  private lastUpdate: number = undefined;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public init(): void {
    if (this.blipTick === undefined) this.blipTick = setTick(async() => {
      // loop through on duty LEO, Fire/EMS & Community Officers and send their location and info to every on duty client.
      const svPlayers = this.server.connectedPlayerManager.GetPlayers;
      const activeUnits: ActiveUnit[] = [];

      for (let i = 0; i < svPlayers.length; i++) {
        if (svPlayers[i].Spawned) { // If selected their character
          const character = await this.server.characterManager.Get(svPlayers[i]);

          if (character) {
            if (character.isLeoJob() || character.isSAFREMSJob() || character.Job.name == Jobs.Community) {
              if (character.Job.Status) {
                const ped = GetPlayerPed(svPlayers[i].Handle);
                const currVeh = GetVehiclePedIsIn(ped, false);

                activeUnits.push({
                  netId: svPlayers[i].Handle,
                  coords: svPlayers[i].Position,
                  heading: Math.ceil(GetEntityHeading(ped)),
                  firstName: character.firstName,
                  lastName: character.lastName,
                  job: character.Job.name,
                  callsign: character.Job.Callsign,
                  inVeh: currVeh > 0,
                  sirenOn: currVeh > 0 && IsVehicleSirenOn(currVeh)
                });
                // console.log("active units", activeUnits);
              } else {
                console.log("off duty");
              }
            }
          }
        }

        if (i == (svPlayers.length - 1)) {
          emitNet(JobEvents.refreshBlipData, -1, activeUnits);
        }
      }

      await Delay(1500);
    });
  }
}