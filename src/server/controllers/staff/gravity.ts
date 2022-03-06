import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import {Server} from "../../server";

export class Gravity {
  private server: Server

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.gravityPlayer, this.EVENT_gravityPlayer.bind(this));
    onNet(Events.ungravityPlayer, this.EVENT_ungravityPlayer.bind(this));
    onNet(Events.shootEntity, this.EVENT_shootEntity.bind(this));
  }

  // Events
  private async EVENT_gravityPlayer(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (myPlayer) {
      if (myPlayer.GetRank >= Ranks.Admin) {
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        myPlayer.TriggerEvent(Events.setHeldEntity, Object.assign({}, holdingPlayer));
        holdingPlayer.TriggerEvent(Events.holdPlayer, Object.assign({}, myPlayer));
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }
  
  private async EVENT_ungravityPlayer(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (myPlayer) {
      if (myPlayer.GetRank >= Ranks.Admin) {
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        holdingPlayer.TriggerEvent(Events.releasePlayer);
        myPlayer.TriggerEvent(Events.unsetHeldEntity);
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }

  private async EVENT_shootEntity(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (myPlayer) {
      if (myPlayer.GetRank >= Ranks.Admin) {
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        holdingPlayer.TriggerEvent(Events.getGravitied);
        myPlayer.TriggerEvent(Events.unsetHeldEntity);
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }
}