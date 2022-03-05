import {Client} from "../client";

import {Deleter} from "../controllers/staff/deleter";

import {Ranks} from "../../shared/enums/ranks";

export class StaffManager {
  private readonly client: Client;

  // Controllers
  private deleter: Deleter;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public init(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      this.deleter = new Deleter(this.client);
    }
  }
}
