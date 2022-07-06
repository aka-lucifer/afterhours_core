import { Client } from '../../client';
import { Inform } from '../../utils';

import clientConfig from "../../../configs/client.json";
import { Ranks } from '../../../shared/enums/ranks';
import { Events } from '../../../shared/enums/events/events';
import { Message } from '../../../shared/models/ui/chat/message';
import { SystemTypes } from '../../../shared/enums/ui/chat/types';

export class ChatCycling {
  private client: Client;

  private chatState: number = undefined;
  private chatMessages: string[] = [];

  private cyclerInterval: NodeJS.Timeout = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Chat Cycling | UI Controller", "Started!");
  }

  // Methods
  public init(): void {
    const messages = clientConfig.controllers.ui.chatCycling.messages;

    for (let i = 0; i < messages.length; i++) {
      this.chatMessages.push(messages[i]);
    }
  }

  public start(): void {
    if (this.client.Player.Spawned) {
      if (this.client.Player.Rank < Ranks.Moderator) {
        this.cyclerInterval = setInterval(() => {
          if (this.client.Player.Spawned && this.client.CharacterSpawned) {
            if (this.chatState !== undefined) { // If we have already started cycling, progress to the next entry
              if ((this.chatState + 1) > this.chatMessages.length) { // If our current entry is the last entry, set it back to the beginning
                this.chatState = 0;
              } else { // Go to the next entry
                this.chatState = this.chatState + 1;
              }
            } else { // If we haven't started cycling yet, set it to the first entry
              this.chatState = 0;
            }

            emit(Events.sendSystemMessage,
              new Message(
                this.chatMessages[this.chatState],
                SystemTypes.Announcement
              )
            );
          }
        }, 600000); // 10 minutes
      }
    }
  }
}
