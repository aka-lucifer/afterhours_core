import { Character } from "./character";

import { Ranks } from '../../shared/enums/ranks';

export class svPlayer {
  private id: number;
  private netId: number;
  private name: string;
  private rank: Ranks;
  private joinedAt: string;
  public spawned: boolean;
  public character: Character;

  constructor(playerData: Record<string, any>) {
    // console.log("ply data", playerData)
    this.id = playerData.id;
    this.netId = playerData.handle;
    this.name = playerData.name;
    this.rank = playerData.rank;
    this.joinedAt = playerData.joinTime;
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
  
  public get Rank(): Ranks {
    return this.rank;
  }

  public set Rank(newRank: Ranks) {
    this.rank = newRank;
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
