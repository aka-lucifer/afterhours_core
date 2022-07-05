import { Game, Model } from 'fivem-js';

import { Client } from '../../client';
import { Delay, Inform } from '../../utils';
import { Events } from '../../../shared/enums/events/events';

export class ModelBlacklist {
  private client: Client;

  private currentModel: Model = undefined;
  private changedModel: boolean = false;

  private tick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("ModelBlacklist | Civilian Controller", "Started!");
  }

  // Getters & Setters
  public get Model(): Model {
    return this.currentModel;
  }
  public set Model(newModel: Model) {
    this.currentModel = newModel;
    this.changedModel = true;
  }

  // Methods
  public start(): void {
    if (this.tick === undefined) this.tick = setTick(async() => {
      if (this.client.player.Spawned) {
        const myPed = Game.PlayerPed;

        if (this.currentModel === undefined) { // If our current model is unassigned
          this.currentModel = myPed.Model;
        } else { // If it is assigned check if it's different
          const currModel = myPed.Model;
          if (currModel.Hash !== this.currentModel.Hash) {
            console.log("changed model!");
            this.currentModel = currModel; // Set new model
            this.changedModel = true; // Set changed our model to true
          }
        }

        if (this.changedModel) {
          console.log("mandem changed his model init bruv!", this.currentModel);
          emitNet(Events.changedPed, this.currentModel.Hash);
          this.changedModel = false;
        } else {
          await Delay(500);
        }
      } else {
        await Delay(500);
      }
    });
  }
}
