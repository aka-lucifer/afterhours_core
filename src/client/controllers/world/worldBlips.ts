import { Blip, Vector3, World } from 'fivem-js';

import { Client } from '../../client';
import { Inform } from '../../utils';

import clientConfig from '../../../configs/client.json';

interface WorldBlip {
  position: Vector3,
  name: string,
  sprite: number,
  colour: number,
  scale: number
}

export class WorldBlips {
  private client: Client;

  private blips: WorldBlip[] = [];
  private createdBlips: Blip[] = [];

  constructor(client: Client) {
    this.client = client;

    Inform("Blips | World Controller", "Started!");
  }

  // Getters
  public get Started(): boolean {
    return this.createdBlips.length > 0;
  }

  // Methods
  public init(): void {
    const interiors = clientConfig.controllers.dev.interiorBlips;
    for (let i = 0; i < interiors.length; i++) {
      this.blips.push({
        position: new Vector3(interiors[i].x, interiors[i].y, interiors[i].z),
        name: interiors[i].label,
        scale: interiors[i].scale,
        sprite: interiors[i].sprite,
        colour: interiors[i].colour
      });
    }
  }

  public start(): void {
    for (let i = 0; i < this.blips.length; i++) {
      const blip = World.createBlip(this.blips[i].position);
      blip.Sprite = this.blips[i].sprite;
      blip.Color = this.blips[i].colour;
      blip.Scale = this.blips[i].scale;
      blip.Name = this.blips[i].name;
      blip.IsShortRange = true;

      this.createdBlips.push(blip);
    }
  }
}
