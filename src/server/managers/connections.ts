
import { Player  } from "../models/player";
import WebhookMessage from "../models/webhook/webhookMessage";

import { PlayerManager } from "../managers/players";

import { Log, Error, Inform, Delay } from "../utils";
import { LogTypes } from "../enums/logTypes";

import * as Config from "../../configs/server.json";
import { Events } from "../../shared/enums/events";
import { Server } from "../server";


export class ConnectionsManager {
  private server: Server;
  private playerManager: PlayerManager;
  
  constructor(server: Server, playerManager: PlayerManager) {
    this.server = server;
    this.playerManager = playerManager;

    // Events
    on(Events.playerConnecting, async(name, setKickReason, deferrals) => {
      deferrals.defer()
      const src = (global as any).source;
      
      const player = new Player(src);      
      const playerExists = await player.Exists();
      
      deferrals.update("Checking Player Data...");
      await Delay(200);

      if (playerExists) { // If your DB entry exists
        deferrals.update("Updating Player Data...");
        await Delay(200);

        const updatedData = player.Update();
        if (updatedData) {
          if (this.server.IsDebugging) {
            Log("Connection Manager", `DB Player (${player.GetName}) Result Updated!`);
          }
        }
      } else {
        if (this.server.IsDebugging) {
          Error("Connection Manager", "No DB entry found, make one!")
        }
        deferrals.update("Creating Player Data...");
        await Delay(200);
        

        const insertedData = await player.Insert();
        if (insertedData) {
          if (this.server.IsDebugging) {
            Log("Connection Manager", `DB Player (${player.GetName}) Result Created!`);
          }
        } else {
          deferrals.done("[Unnamed Project]: There was an error creating your information!");
          Error("Connection Manager", "There was an error creating your information")
          return;
        }
      }

      this.server.playerManager.Add(player);

      if (this.server.Whitelisted) {
        Inform("Whitelist Check", "Whitelist Active!");
        const whitelisted = await player.Whitelisted();
        if (!whitelisted) {
          Inform("Whitelist Check", "Not whitelisted!");
          deferrals.done("[Unnamed Project]: Whitelist Active!");
        } else {
          deferrals.done();
        }
      } else {
        deferrals.done();
      }
    })

    on(Events.playerDisconnected, async(reason: string) => {
      await playerManager.Remove(source, reason);
    });
  }
}