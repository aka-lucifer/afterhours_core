import { Client } from "../../../client";

export class JobBlips {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }
}