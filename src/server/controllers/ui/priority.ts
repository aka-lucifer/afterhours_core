import { Server } from "../../server";

import { Player } from '../../models/database/player';
import { Events } from '../../../shared/enums/events/events';
import { JobCommand } from '../../models/ui/chat/command';
import { Jobs } from '../../../shared/enums/jobs/jobs';
import { Message } from '../../../shared/models/ui/chat/message';
import { SystemTypes } from '../../../shared/enums/ui/chat/types';

export enum UnitStatus {
  Active,
  Busy,
  Break
}

enum PriorityState {
  Available,
  Active,
  Unavailable
}

interface Unit {
  player: Player;
  status: UnitStatus
}

export class Priority {
  private server: Server;

  private units: Unit[] = [];
  private priority: PriorityState = PriorityState.Unavailable;

  constructor(server: Server) {
    this.server = server;
  }

  // Getters
  private get ActiveUnits(): number {
    let activeUnits = 0;

    for (let i = 0; i < this.units.length; i++) {
      if (this.units[i].status == UnitStatus.Active) {
        activeUnits++;
      }
    }

    return activeUnits;
  }

  // Methods
  private registerCommands(): void {
    new JobCommand("active", "Sets your status to active/in-active", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          const character = await this.server.characterManager.Get(player);

          if (character) {
            // If on duty
            if (character.Job.status) {
              const myIndex = this.units.findIndex(unit => unit.player.Handle === player.Handle);
              if (myIndex !== -1) {
                if (this.units[myIndex].status === UnitStatus.Active) {
                  this.units[myIndex].status = UnitStatus.Busy;
                } else {
                  this.units[myIndex].status = UnitStatus.Active;
                }

                this.sync(); // Update active & total units on all clients.
              }
            } else {
              await player.TriggerEvent(Events.sendSystemMessage, new Message("You aren't on duty!", SystemTypes.Error));
            }
          }
        }
      }
    }, [Jobs.State, Jobs.Police, Jobs.County]);
  }

  public init(): void {
    this.registerCommands();
  }

  public Add(player: Player): number {
    const newLength = this.units.push({
      player: player,
      status: UnitStatus.Active
    });

    this.sync(); // Update active & total units on all clients.

    return newLength;
  }

  public async Exists(player: Player): Promise<boolean> {
    const unitIndex = this.units.findIndex(unit => unit.player.Handle === player.Handle);
    return unitIndex !== -1;
  }

  public Update(player: Player, newState: UnitStatus): boolean {
    const unitIndex = this.units.findIndex(unit => unit.player.Handle === player.Handle);
    if (unitIndex !== -1) {
      this.units[unitIndex].status = newState; // Update their active state
      this.sync(); // Update active & total units on all clients.

      return true;
    }

    return false;
  }

  public async Remove(player: Player): Promise<boolean> {
    const unitIndex = this.units.findIndex(unit => unit.player.Handle === player.Handle);
    if (unitIndex !== -1) {
      this.units.splice(unitIndex, 1);

      this.sync(); // Update active & total units on all clients.
      return true;
    }

    return false;
  }

  public sync(): void {
    const activeUnits = this.ActiveUnits;
    const units = this.units.length;
    let newPriority = PriorityState.Available;
    const fiftyPercent = (units / 100) * 50;
    const twentyPercent = (units / 100) * 20;

    console.log("sync priority | active units", activeUnits, "units", units, "fiftyPercent", fiftyPercent, "twentyPercent", twentyPercent);

    if (units > 0) {
      if (activeUnits >= fiftyPercent) { // If there are more or 50% of active units, out of the total units
        newPriority = PriorityState.Available;
      } else if (activeUnits >= twentyPercent && activeUnits < fiftyPercent) { // If there are more or 20% of active units and there are less than 50%, out of the total units
        newPriority = PriorityState.Active;
      } else if (activeUnits < twentyPercent) { // If there are less than 20% of active units, out of the total units
        newPriority = PriorityState.Unavailable;
      }
    } else {
      newPriority = PriorityState.Unavailable;
    }

    console.log("sync units and priority", this.priority, newPriority);

    emitNet(Events.updateUnits, -1, activeUnits, units); // Update active & total units on all clients.

    // If the new priority is different than our current priority state
    if (this.priority !== newPriority) {
      this.priority = newPriority;
      emitNet(Events.updatePriority, -1, this.priority);
    }
  }
}
