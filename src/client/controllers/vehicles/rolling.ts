import { Game, Vector3, Vehicle } from "fivem-js";

import { Inform, LoadAnim, PlayAnim } from "../../utils";

import { Progress } from "../../models/ui/progress";
import { Notification } from "../../models/ui/notification";

import { Events } from "../../../shared/enums/events/events";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class Rolling {
  constructor() {
    Inform("Vehicle | Rolling Controller", "Started!");

    // Events
    on(Events.flipVehicle, this.EVENT_flipVehicle.bind(this));
  }

  // Methods
  private registerInteractions(): void {
    emit("astrid_target:client:vehicle", {
      options: [
        {
          event: Events.flipVehicle,
          icon: "fas fa-solid fa-car-burst",
          label: "Flip Vehicle",
        }
      ],
      distance: 2
    });
  }

  public init(): void {
    this.registerInteractions();
  }

  // Events
  private async EVENT_flipVehicle(data: Record<string, any>): Promise<void> {
    // console.log("flip veh data", data);
    if (data.entity > 0) {
      const vehicle = new Vehicle(data.entity);
      // console.log(`Vehicle - (Handle: ${vehicle.Handle} | Net Id: ${vehicle.NetworkId} | Roll: ${vehicle.Rotation.x})`);

      const loadedAnim = LoadAnim("missfinale_c2ig_11");
      if (loadedAnim) {
        const myPed = Game.PlayerPed;
        const vehRoll = vehicle.Rotation.x;
        const animLength = vehRoll < -110 || vehRoll > 110 ? 10000 : 5000;

        const progress = new Progress(animLength, {
          combat: true,
          movement: true
        }, async() => {
          ClearPedTasks(Game.PlayerPed.Handle);
          const notify = new Notification("Vehicle", "You stopped flipping the vehicle!", NotificationTypes.Error);
          await notify.send();
        }, () => {
          PlayAnim(Game.PlayerPed, "missfinale_c2ig_11", "pushcar_offcliff_m", 35, animLength, 8.0, -8.0, 0.0, false, false, false);
        }, async() => {
          StopAnimTask(Game.PlayerPed.Handle, "missfinale_c2ig_11", "pushcar_offcliff_m", 1.0);
          ClearPedTasks(myPed.Handle);
          vehicle.Rotation = new Vector3(vehicle.Rotation.x, -0, vehicle.Heading);

          const notify = new Notification("Vehicle", "You flipped your vehicle!", NotificationTypes.Success);
          await notify.send();
        })

        progress.start();
      }
    }
  }
}