import {Server} from "../server";

import {Gravity} from "../controllers/staff/gravity";

import {Ranks} from "../../shared/enums/ranks";

export class StaffManager {
  private readonly server: Server;

  // Controllers
  private gravityGun: Gravity;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public init(): void {
    this.gravityGun = new Gravity(this.server);
  }
}
