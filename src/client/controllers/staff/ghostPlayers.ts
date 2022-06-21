import { Control, Font, Game, InputMode, Ped, Vector3 } from "fivem-js";

import { Delay, Dist, Draw3DText, Inform } from "../../utils";

import { svPlayer } from "../../models/player";
import { Notification } from "../../models/ui/notification";

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

interface GhostPlayer {
  netId: number,
  player: svPlayer,
  license: string,
  ped: Ped,
  position: Vector3
}

export class GhostPlayers {
  private tick: number = undefined;
  private interactionTick: number = undefined;

  private createdPeds: GhostPlayer[] = [];
  private currentPos: Vector3 = undefined;

  constructor() {
    // Events
    onNet(Events.createGhostPlayer, this.EVENT_createGhostPlayer.bind(this));
    onNet(Events.deleteGhostPlayer, this.EVENT_deleteGhostPlayer.bind(this));

    Inform("Staff | Ghost Players Controller", "Started!");
  }

  // Events
  private async EVENT_createGhostPlayer(playerData: any, playerLicense: string, position: Vector3, heading: number, model: number): Promise<void> {
    const player = new svPlayer(playerData);

    // Create the ped
    const pedHandle = CreatePed(26, model, position.x, position.y, position.z, heading, false, false); // Have to make the ped this way as we want it un-networked.
    const ped = new Ped(pedHandle);

    // Set important data and flags
    ped.IsInvincible = true;
    ped.CanRagdoll = false;
    SetEntityProofs(ped.Handle, true, true, true, true, true, true, true, true);
    ped.IsOnlyDamagedByPlayer = false;
    SetEntityCanBeDamaged(ped.Handle, false);
    SetEntityInvincible(ped.Handle, true);
    SetBlockingOfNonTemporaryEvents(ped.Handle, true);

    // Set them transparent
    SetEntityAlpha(ped.Handle, 200, 0);

    // Remove their collision
    SetEntityCollision(ped.Handle, false, true);

    // Insert players data into array
    this.createdPeds.push({
      netId: player.NetworkId,
      player: player,
      license: playerLicense,
      ped: ped,
      position: position
    });

    if (this.tick === undefined) this.start();

    // Wait until they're on the ground and freeze them
    await Delay(500);
    ped.IsPositionFrozen = true;
  }

  private EVENT_deleteGhostPlayer(netId: number): void {
    const pedIndex = this.createdPeds.findIndex(player => player.netId === netId);
    if (pedIndex !== -1) {
      this.createdPeds[pedIndex].ped.delete();
      this.createdPeds.splice(pedIndex, 1);

      if (this.createdPeds.length <= 0) {
        if (this.tick !== undefined) {
          clearTick(this.tick);
          this.tick = undefined;
        }
        
        if (this.interactionTick !== undefined) {
          clearTick(this.interactionTick);
          this.interactionTick = undefined;
        }
      }
    }
  }

  // Methods
  private start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      const myPed = Game.PlayerPed;

      for (let i = 0; i < this.createdPeds.length; i++) {
        let dist = myPed.Position.distance(this.createdPeds[i].position);

        if (dist <= 10) {
          if (this.currentPos === undefined) this.currentPos = this.createdPeds[i].position;

          if (this.interactionTick === undefined) this.interactionTick = setTick(async() => {
            dist = myPed.Position.distance(this.createdPeds[i].position); // Update our dist

            if (!IsPedInAnyVehicle(myPed.Handle, false)) {
              if (dist <= 10) {
                if (dist > 1.5) {
                  Draw3DText(
                    this.createdPeds[i].position,
                    {r: 255, g: 255, b: 255, a: 255},
                    "I recently left the server.\nGet closer to get my information.",
                    Font.ChaletComprimeCologne,
                    false, 0.5,
                    true
                  );
                } else {
                  Draw3DText(
                    this.createdPeds[i].position,
                    {r: 255, g: 255, b: 255, a: 255},
                    "I recently left the server. \nPress ~c~[~g~E~c~] ~w~to get my information",
                    Font.ChaletComprimeCologne,
                    false, 0.5,
                    true
                  );

                  if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Context)) {
                    const playerInfo = this.copyInformation(this.createdPeds[i].player, this.createdPeds[i].license);

                    SendNuiMessage(JSON.stringify({
                      event: NuiMessages.CopyCode,
                      data: {
                        text: playerInfo
                      }
                    }))

                    const notify = new Notification("Staff", "Copied players information to your clipboard.", NotificationTypes.Info);
                    await notify.send();
                  }
                }
              }
            }
          });
        }
      }

      if (this.currentPos !== undefined) {
        const dist = Dist(this.currentPos, myPed.Position, true);

        if (dist > 10) {
          this.currentPos = undefined;

          if (this.interactionTick !== undefined) {
            clearTick(this.interactionTick);
            this.interactionTick = undefined;
          }
        }
      }

      await Delay(1000);
    });
  }

  private copyInformation(player: svPlayer, license: string): string {
    return `Server ID: ${player.NetworkId} | Name: ${player.Name} | License: ${license} | Rank: ${Ranks[player.Rank]}`;
  }
}
