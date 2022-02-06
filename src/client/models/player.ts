import { Game, Ped } from "fivem-js";

export class Player {
  public id: number;
  public handle: number;
  public name: string;
  public rank: number;
  public ped: Ped;

  constructor(playerData: Player) {
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
}