import { VehicleSeat } from 'fivem-js';

import { Server } from '../../server';
import { Delay, getClosestPlayer } from '../../utils';

import { Events } from '../../../shared/enums/events/events';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';
import { GrabState } from '../../../shared/enums/jobs/grabStates';
import { JobEvents } from '../../../shared/enums/events/jobs/jobEvents';
import { CuffState } from '../../../shared/enums/jobs/cuffStates';
import { InteractionStates } from '../../../shared/enums/jobs/interactionStates';

export class Seating {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.seatPlayer, this.EVENT_seatPlayer.bind(this));

    RegisterCommand("unseat", async (source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const [closestPlayer, dist] = await getClosestPlayer(player);

          // If we have found a player
          if (closestPlayer) { // If the player is close enough to you
            if (dist <= 3.0) {
              const closestPed = GetPlayerPed(closestPlayer.Handle);

              if (closestPed > 0) { // If their ped exists in your world scope
                const currVehicle = GetVehiclePedIsIn(closestPed, false);
                if (currVehicle > 0) { // Have to use this native as `IsPedInAnyVehicle` isn't available on the server
                  const closestPlayersStates = Player(closestPlayer.Handle);

                  if (closestPlayersStates.state.interationState == InteractionStates.Seated) {
                    TaskLeaveVehicle(closestPed, currVehicle, 256);

                    // Keep running this (Don't relow the below code, until the player has fully exited the vehicle)
                    while (GetVehiclePedIsIn(closestPed, false) > 0) {
                      console.log("Still inside their vehicle");
                      await Delay(100);
                    }

                    console.log("exited vehicle!");

                    // Regrab them if they were grabbed
                    const myStates = Player(player.Handle);
                    if (closestPlayersStates.state.grabState == GrabState.Seated) {
                      console.log("player was previously held before being seated", closestPlayer.Handle);
                      myStates.state.grabState = GrabState.Holding;
                      await player.TriggerEvent(JobEvents.startGrabbing, closestPlayer.Handle, player.Handle);
                    }

                    closestPlayersStates.state.interationState = GrabState.None;
                  } else {
                    await player.Notify("Unseating", "This person hasn't been seated inside this vehicle!", NotificationTypes.Error);
                  }
                } else {
                  await player.Notify("Unseating", "Player isn't inside a vehicle!", NotificationTypes.Error);
                }
              }
            } else {
              await player.Notify("Unseating", "Player is too far away!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Unseating", "No one found!", NotificationTypes.Error);
          }
        }
      }
    }, false);
  }

  // Events
  private async EVENT_seatPlayer(vehNet: number, freeSeat: VehicleSeat): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (player.Spawned) {
        const vehicle = NetworkGetEntityFromNetworkId(vehNet);
        if (vehicle && vehicle > 0) { // If the passed vehicle exists
          const [closestPlayer, dist] = await getClosestPlayer(player);

          // If we have found a player
          if (closestPlayer) { // If the player is close enough to you
            if (dist <= 3.0) {
              const closestPed = GetPlayerPed(closestPlayer.Handle);

              if (closestPed > 0) { // If their ped exists in your world scope
                const playerStates = Player(closestPlayer.Handle);
                const closestPlayersStates = Player(closestPlayer.Handle);

                // Disable Grabbing (If it's being done)
                if (playerStates.state.grabState == GrabState.Holding) { // If we're holding the little shitbag
                  playerStates.state.grabState = GrabState.Seating;
                  await player.TriggerEvent(JobEvents.stopGrabbing);
                }

                if (closestPlayersStates.state.grabState == GrabState.Held) { // If the fat cunt is being held
                  closestPlayersStates.state.grabState = GrabState.Seated;
                  await closestPlayer.TriggerEvent(JobEvents.stopGrabbing);
                }

                closestPlayersStates.state.interationState = InteractionStates.Seated;

                // Teleport the player into the vehicle, to the passed seat
                TaskWarpPedIntoVehicle(closestPed, vehicle, freeSeat); // Teleport them inside the vehicle

                // Play cuffed animation if the dipshit is handcuffed
                console.log("cuff states", closestPlayersStates.state.cuffState)
                if (closestPlayersStates.state.cuffState == CuffState.Cuffed || closestPlayersStates.state.cuffState == CuffState.Shackled) {
                  await closestPlayer.TriggerEvent(Events.seatCuffAnim); // Have to do it this way as OneSync doesn't even let you use the server sided `TaskPlayAnim`
                }
              }
            } else {
              await player.Notify("Seating", "Player is too far away!", NotificationTypes.Error);
            }
          } else {
            await player.Notify("Seating", "No one found!", NotificationTypes.Error);
          }
        }
      }
    }
  }
}
