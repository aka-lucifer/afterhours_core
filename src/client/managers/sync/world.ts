import {Client} from "../../client";
import {Delay, GetHash} from "../../utils";

import clientConfig from "../../../configs/client.json";

import {Game, Ped} from "fivem-js";

export class WorldManager {
  private client: Client;
  private clearerTick: number = undefined;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public async init(): Promise<void> {
    const pickups = clientConfig.world.weaponPickups;
    // Disable default EMS & Fire
    for (let i = 0; i < 30; i++) {
      EnableDispatchService(i, false);
    }

    // Disable World Pickups
    for (let i = 0; i < pickups.length; i++) {
      ToggleUsePickupsForPlayer(Game.PlayerPed.Handle, GetHash(pickups[i]), false);
    }

    this.clearerTick = setTick(async() => {
      const myPed = Game.PlayerPed;

      this.disablePolice(myPed);
      this.disablePVP(myPed);
      this.disableVehRewards(myPed);
      this.disableHealthRecharge(myPed);
      this.disableWorldTraffic(myPed);

      await Delay(500);
    });

    console.log("DISABLE WORLD SHIT!");
  }

  // Disable Wanted Level, Police Radio, Vehicle & Vehicle Rewards
  private disablePolice(ped: Ped): void {
    const myCoords = ped.Position;

    // Wanted Level Removing
    SetPlayerWantedLevel(Game.Player.Handle, 0, false);
    SetPlayerWantedLevelNow(Game.Player.Handle, false);

    // Disable Police Radio
    CancelCurrentPoliceReport();

    // Deletes Police Vehicles
    ClearAreaOfCops(myCoords.x, myCoords.y, myCoords.z, 400.0, 0);

    // Police Vehicle Rewards
    DisablePlayerVehicleRewards(ped.Handle);

    // Disable Ambient Sirens
    DistantCopCarSirens(false);
  }

  // Disable PVP
  private disablePVP(ped: Ped): void {
    SetCanAttackFriendly(ped.Handle, true, true);
    SetPedSuffersCriticalHits(ped.Handle,false);
    NetworkSetFriendlyFireOption(true);
  }

  // Police Vehicle Rewards
  private disableVehRewards(ped: Ped): void {
    DisablePlayerVehicleRewards(ped.Handle);
  }

  // Disable Health Recharge
  private disableHealthRecharge(ped: Ped) {
    SetPlayerHealthRechargeMultiplier(ped.Handle, 0);
  }

  // Disable Vehicles, Peds
  private disableWorldTraffic(ped: Ped) {

    // Density
    SetVehicleDensityMultiplierThisFrame(0.1);
    SetRandomVehicleDensityMultiplierThisFrame(0.1);
    SetParkedVehicleDensityMultiplierThisFrame(0.1);
    SetDistantCarsEnabled(false);

    // Traffic
    SetGarbageTrucks(false); // Stop garbage trucks from randomly spawning
    SetRandomBoats(false); // Stop random boats from spawning in the water.
    SetCreateRandomCops(false); // Disable random cops walking/driving around.
    SetCreateRandomCopsNotOnScenarios(false); // Stop random cops (not in a scenario) from spawning.
    SetCreateRandomCopsOnScenarios(false); // Stop random cops (in a scenario) from spawning.
    SetVehicleModelIsSuppressed(GetHash("rubble"), true);
    SetVehicleModelIsSuppressed(GetHash("taco"), true);
    SetVehicleModelIsSuppressed(GetHash("biff"), true);
    SetVehicleModelIsSuppressed(GetHash("blimp"), true);
    SetVehicleModelIsSuppressed(GetHash("ambulance"), true);
    SetVehicleModelIsSuppressed(GetHash("frogger"), true);
    SetIgnoreLowPriorityShockingEvents(ped.Handle, true);
  }
}
