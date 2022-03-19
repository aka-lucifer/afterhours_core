import { Game, Ped } from "fivem-js";
import { Character } from "./character";

export class svPlayer {
  private id: number;
  private netId: number;
  private name: string;
  private rank: number;
  private ped: Ped;
  private spawned: boolean;

  constructor(playerData: Record<string, any>) {
    this.id = playerData.id;
    this.netId = playerData.handle;
    this.name = playerData.name;
    this.rank = playerData.rank;
    this.ped = Game.Player.Character;
  }

  // Getters & Setters
  public get Id(): number {
    return this.id;
  }

  public get NetworkId(): number {
    return this.netId
  }

  public get Name(): string {
    return this.name;
  }
  
  public get Rank(): number {
    return this.rank;
  }

  public get Ped(): Ped {
    return this.ped;
  }

  public get Spawned(): boolean {
    return this.spawned;
  }

  public set Spawned(newValue: boolean) {
    this.spawned = newValue;
  }
}