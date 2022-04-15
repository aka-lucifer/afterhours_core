import { Game, Ped } from "fivem-js";
import { Character } from "./character";

export class svPlayer {
  private id: number;
  private netId: number;
  private name: string;
  private rank: number;
  private joinedAt: string;
  private ped: Ped;
  public spawned: boolean;
  public character: Character;

  constructor(playerData: Record<string, any>) {
    // console.log("ply data", playerData)
    this.id = playerData.id;
    this.netId = playerData.handle;
    this.name = playerData.name;
    this.rank = playerData.rank;
    this.joinedAt = playerData.joinTime;
    this.ped = new Ped(GetPlayerFromServerId(this.netId));
    this.spawned = playerData.spawned;
    
    if (playerData.selectedCharacter !== undefined) {
      this.character = playerData.selectedCharacter;
    }
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

  public get Character(): Character {
    return this.character;
  }
}