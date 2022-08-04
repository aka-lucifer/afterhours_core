import {Server} from "../../server";

import { Events } from "../../../shared/enums/events/events";
import { Ranks } from "../../../shared/enums/ranks";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class Gravity {
  private server: Server

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.gravityPlayer, this.EVENT_gravityPlayer.bind(this));
    onNet(Events.ungravityPlayer, this.EVENT_ungravityPlayer.bind(this));
    onNet(Events.shootEntity, this.EVENT_shootEntity.bind(this));
  }

  public async checkDetaching(playersNet: string): Promise<void> {
    const myStates = Player(playersNet)
    if (myStates.state.usingGravityGun) {
      const attachedPlayer = await this.server.connectedPlayerManager.GetPlayer(myStates.state.gravitiedPlayer);
      if (attachedPlayer) {
        await attachedPlayer.TriggerEvent(Events.releasePlayer);

        myStates.state.usingGravityGun = false;
        myStates.state.gravitiedPlayer = -1;
      }
    }
  }

  // Events
  private async EVENT_gravityPlayer(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (myPlayer) {
      if (myPlayer.Rank >= Ranks.Moderator) {
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        if (holdingPlayer) {
          const myStates = Player(myPlayer.Handle);

          if (!myStates.state.usingGravityGun) {
            myStates.state.usingGravityGun = true;
            myStates.state.gravitiedPlayer = holdingPlayer.Handle;

            myPlayer.TriggerEvent(Events.setHeldEntity, Object.assign({}, holdingPlayer));
            holdingPlayer.TriggerEvent(Events.holdPlayer, Object.assign({}, myPlayer));
          }
        }
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }
  
  private async EVENT_ungravityPlayer(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (myPlayer) {
      if (myPlayer.Rank >= Ranks.Moderator) {
        console.log("player to detach", playersNet)
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        if (holdingPlayer) {
          const myStates = Player(myPlayer.Handle);
          if (myStates.state.usingGravityGun) {
            myStates.state.usingGravityGun = false;

            holdingPlayer.TriggerEvent(Events.releasePlayer);
            myPlayer.TriggerEvent(Events.unsetHeldEntity);
          }
        }
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }

  private async EVENT_shootEntity(playersNet: number): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (myPlayer) {
      if (myPlayer.Rank >= Ranks.Moderator) {
        const holdingPlayer = await this.server.connectedPlayerManager.GetPlayer(playersNet.toString());
        if (holdingPlayer) {
          const myStates = Player(myPlayer.Handle);
          if (myStates.state.usingGravityGun) {
            myStates.state.usingGravityGun = false;

            holdingPlayer.TriggerEvent(Events.getGravitied);
            myPlayer.TriggerEvent(Events.unsetHeldEntity);
          }
        }
      } else {
        myPlayer.Notify("Gravity Gun", "Fuck off you don't have permission you injecting little twat!", NotificationTypes.Error);
      }
    }
  }
}