import {Playtime} from "./playtime";

export class DBPlayer {
  public id: number;
  private readonly name: string;
  private license: string;
  private rank: number;
  public playtime: number;
  private firstJoin: Date;
  private whitelisted: boolean = false;

  constructor(data?: Record<string, any>) {
    this.id = data.player_id;
    this.name = data.name;
    this.license = data.license;
    this.rank = data.rank;
    this.playtime = data.playtime;
    this.firstJoin = new Date(data.initial_connection);
    this.whitelisted = data.whitelisted > 0;

    // console.log("Added DB Player", this);
  }

  // Get Requests
  public get Id(): number {
    return this.id;
  }

  public get GetName(): string {
    return this.name;
  }

  public get Rank(): number {
    return this.rank;
  }
}
