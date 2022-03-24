import {Client} from "../client";

import {Deleter} from "../controllers/staff/deleter";

import {Ranks} from "../../shared/enums/ranks";
import { Events } from "../../shared/enums/events/events";
import { Message } from "../../shared/models/ui/chat/message";
import { SystemTypes } from "../../shared/enums/ui/chat/types";

export class StaffManager {
  private readonly client: Client;

  // Controllers
  private deleter: Deleter;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(Events.showRank, this.EVENT_showRank.bind(this));
  }

  // Methods
  public init(): void {
    if (this.client.player.Rank >= Ranks.Admin) {
      this.deleter = new Deleter(this.client);
    }
  }

  // Events
  public EVENT_showRank(): void {
    this.client.playerStates.state.set("rankVisible", !this.client.playerStates.state.rankVisible, true);
    if (this.client.playerStates.state.rankVisible) {
      emit(Events.sendSystemMessage, new Message("Your rank is now visible in your name.", SystemTypes.Interaction));
    } else {
      emit(Events.sendSystemMessage, new Message("Your rank is no longer visible in your name.", SystemTypes.Action));
    }
  }
}
