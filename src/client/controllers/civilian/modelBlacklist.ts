import { Game, Model } from 'fivem-js';

import { Client } from '../../client';
import { Delay, Inform } from '../../utils';

import { Events } from '../../../shared/enums/events/events';

import serverConfig from "../../../configs/server.json";
import {Ranks} from "../../../shared/enums/ranks";

export class ModelBlacklist {
  private client: Client;

  private currentModel: Model = undefined;
  private changedModel: boolean = false;

  private tick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    onNet(Events.setPed, (newModel: string) => {
      this.currentModel = new Model(newModel);
    })

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
          console.log("model stuff", currModel.Hash, this.currentModel.Hash)
          if (currModel.Hash !== this.currentModel.Hash) {
            this.currentModel = currModel; // Set new model
            this.changedModel = true; // Set changed our model to true
          }
        }

        if (this.changedModel) {
          emitNet(Events.changedPed, this.currentModel.Hash);
          this.changedModel = false;
        } else {
          const pedData = serverConfig.peds[this.currentModel.Hash];
          if (pedData !== undefined) {
            const hasPerm = await this.hasPermission(this.client.player.Rank, pedData.rank);
            if (!hasPerm) {
              emitNet(Events.changedPed, this.currentModel.Hash);
            } else {
              await Delay(500);
            }
          } else {
            await Delay(500);
          }
        }
      } else {
        await Delay(500);
      }
    });
  }

  private async hasPermission(myRank: Ranks, pedRank: number): Promise<boolean> {
      if (myRank >= pedRank) {
      return true;
    }

    return false;
  }

}
