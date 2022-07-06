import { Game, VehicleClass, VehicleColor } from "fivem-js";

import { Client } from "../../client";
import { insideVeh, RegisterNuiCallback } from "../../utils";

import { Vehicle } from "../../models/ui/vehicle"
import { ServerCallback } from "../../models/serverCallback";

import { Events } from "../../../shared/enums/events/events";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";

import { Callbacks } from "../../../shared/enums/events/callbacks";
import { formatSplitCapitalString, splitCapitalsString } from "../../../shared/utils";

export class Vehicles {
  private client: Client;
  private myVehicles: Vehicle[];

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.registerCallbacks();

    // Events
    onNet(Events.setupVehicles, this.EVENT_setupVehicles.bind(this));
    onNet(Events.displayVehicles, this.EVENT_displayVehicles.bind(this));
  }

  // Getters
  public get HasVehicles(): boolean {
    return this.myVehicles.length > 0;
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseVehicles, (data, cb) => {
      SetNuiFocus(false, false);
      cb(true);
    });

    RegisterNuiCallback(NuiCallbacks.CreateVehicle, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.createVehicle, {data}, (cbData) => {
        cb(cbData)
      }));
    });

    RegisterNuiCallback(NuiCallbacks.EditVehicle, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.editVehicle, {data}, (cbData) => {
        cb(cbData)
      }));
    });

    RegisterNuiCallback(NuiCallbacks.DeleteVehicle, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.deleteVehicle, {data}, (cbData) => {
        cb(cbData)
      }));
    });
  }

  // Methods

  // Events
  private EVENT_setupVehicles(vehicles: Vehicle[]): void {
    // console.log("recieved char vehicles", vehicles);
    this.myVehicles = vehicles;

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SetupVehicles,
      data: {
        vehicles: this.myVehicles
      }
    }))
  }

  private async EVENT_displayVehicles(): Promise<void> {
    let vehData = {};
    const [currVeh, inside] = await insideVeh(Game.PlayerPed);

    if (inside) {
      const model = currVeh.DisplayName;
      const label = GetLabelText(model);
      const type = VehicleClass[currVeh.ClassType];
      const primaryColourSplit = splitCapitalsString(VehicleColor[currVeh.Mods.PrimaryColor]);
      const formattedPrimaryColour = formatSplitCapitalString(primaryColourSplit);
      const secondaryColourSplit = splitCapitalsString(VehicleColor[currVeh.Mods.SecondaryColor]);
      const formattedSecondaryColour = formatSplitCapitalString(secondaryColourSplit);

      const colour = `${formattedPrimaryColour}, ${formattedSecondaryColour}`;
      const plate = currVeh.NumberPlate;
      
      vehData = {
        inside: true,
        label: label,
        model: model,
        type: type,
        colour: colour,
        plate: plate
      }
    }

    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.DisplayVehicles,
      data: {
        vehData: vehData
      }
    }))
  }
}