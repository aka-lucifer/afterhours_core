
import { Server } from "../../server";

import { Command, JobCommand } from "../../models/ui/chat/command";
import { Jobs } from "../../../shared/enums/jobs/jobs";

export class PoliceJob {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  private registerCommands(): void {
    new JobCommand("runname", "Run a suspects name in the CAD/MDT", [{name: "name", help: "Persons name"}], true, async(source: string, args: any[]) => {
      console.log("run name init", args);
    }, Jobs.State)
  }

  public init(): void {
    this.registerCommands();
  }
}