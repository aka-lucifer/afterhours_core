import { Vector3 } from "fivem-js";

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
  status: boolean;
  inVeh: boolean;
  sirenOn?: boolean,
  vehType?: string
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

      for (let i = 0; i < svPlayers.length; i++) { // Loop through all server players
        if (svPlayers[i].Spawned) { // If selected their character
          const character = await this.server.characterManager.Get(svPlayers[i]);

          if (character) { // If their character has been loaded
            if (character.isLeoJob() || character.isSAFREMSJob() || character.Job.name == Jobs.Community) { // If character is LEO, Fire/EMS or Community Officers
              if (character.Job.Status) { // If character is on duty
                const ped = GetPlayerPed(svPlayers[i].Handle); // Get their characters ped
                const pedCoords = GetEntityCoords(ped);
                const pedPosition = new Vector3(pedCoords[0], pedCoords[1], pedCoords[2]);
                const currVeh = GetVehiclePedIsIn(ped, false); // Check if they're inside a vehicle

                console.log("info before push (unit blips)", ped, JSON.stringify(pedCoords), pedPosition, currVeh, GetVehicleType(currVeh), character.Job, character.firstName, character.lastName, IsVehicleSirenOn(currVeh));
                activeUnits.push({ // Push new element into active units array.
                  netId: svPlayers[i].Handle,
                  coords: pedPosition,
                  heading: Math.ceil(GetEntityHeading(ped)),
                  firstName: character.firstName,
                  lastName: character.lastName,
                  job: character.Job.name,
                  callsign: character.Job.Callsign,
                  status: character.Job.Status,
                  inVeh: currVeh > 0,
                  sirenOn: currVeh > 0 && IsVehicleSirenOn(currVeh),
                  vehType: GetVehicleType(currVeh)
                });
              }
            }
          }
        }

        if (i == (svPlayers.length - 1)) { // Once we're on the last entry in connected players, send all active units to every client
          if (activeUnits.length > 0) console.log("unit blips", activeUnits);
          for (let b = 0; b < activeUnits.length; b++) { // For all of the active units, send the active units array to each of them
            emitNet(JobEvents.refreshBlipData, activeUnits[b].netId, activeUnits);
          }
        }
      }

      await Delay(3000);
    });
  }
}
