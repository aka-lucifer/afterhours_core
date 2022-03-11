import { Game, Ped } from "fivem-js";

export class Player {
  public id: number;
  public handle: number;
  public name: string;
  public rank: number;
  public ped: Ped;
  private spawned: boolean;

  constructor(playerData: Record<string, any>) {
    this.id = playerData.id;
    this.handle = Game.Player.Handle;
    this.name = playerData.name;
    this.rank = playerData.rank;
    this.ped = Game.Player.Character;
  }

  // Get Requests
  public get PlayerId(): number {
    return this.id;
  }

  public get Handle(): number {
    return this.handle
  }
  
  public get Rank(): number {
    return this.rank;
  }

  public get Spawned(): boolean {
    return this.spawned;
  }

  public set Spawned(newValue: boolean) {
    this.spawned = newValue;
  }
}