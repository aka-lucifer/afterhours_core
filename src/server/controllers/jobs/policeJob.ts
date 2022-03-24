import { Server } from "../../server";

export class PoliceJob {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }
}