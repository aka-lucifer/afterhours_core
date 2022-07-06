export class DBPlayer {
  public id: number;
  private license: string;
  private hardwareId: string;
  private readonly name: string;
  private rank: number;
  public playtime: number;
  private whitelisted: boolean = false;
  private discord: string;
  private firstJoin: Date;

  constructor(data?: Record<string, any>) {
    this.id = data.player_id;
    this.license = data.identifier;
    this.hardwareId = data.hardware_id;
    this.name = data.name;
    this.rank = data.rank;
    this.playtime = data.playtime;
    this.whitelisted = data.whitelisted > 0;
    this.discord = data.discord;
    this.firstJoin = new Date(data.initial_connection);

    // console.log("Added DB Player", this);
  }

  // Get Requests
  public get Id(): number {
    return this.id;
  }

  public get License(): string {
    return this.license;
  }

  public get HardwareId(): string {
    return this.hardwareId;
  }

  public get GetName(): string {
    return this.name;
  }

  public get Rank(): number {
    return this.rank;
  }

  public get Discord(): string {
    return this.discord;
  }
}
