import { Game } from "fivem-js";

import {Client} from "../../client";
import {RegisterNuiCallback} from "../../utils";

import {ServerCallback} from "../../models/serverCallback";
import { Notification } from "../../models/ui/notification";

import {ChatStates} from "../../enums/ui/chat/chatStates";

import {Message} from "../../../shared/models/ui/chat/message";
import {NuiCallbacks} from "../../../shared/enums/ui/nuiCallbacks";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {Events} from "../../../shared/enums/events/events";
import {Ranks} from "../../../shared/enums/ranks";
import {Callbacks} from "../../../shared/enums/events/callbacks";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class ChatManager {
  private client: Client;
  private chatTypes: string[] = [];
  private chatSuggestions: Suggestion[] = [];
  private chatState: ChatStates = ChatStates.Closed;
  
  constructor (client: Client) {
    this.client = client;
    // console.log("STARTED CHAT MANAGER!");

    // Events
    onNet(Events.setTypes, this.EVENT_setTypes.bind(this));
    onNet(Events.addSuggestion, this.EVENT_addSuggestion.bind(this));
    onNet(Events.updateSuggestions, this.EVENT_updateSuggestions.bind(this));
    onNet(Events.removeSuggestions, this.EVENT_removeSuggestions.bind(this));
    onNet(Events.sendClientMessage, this.EVENT_newMsg.bind(this))
    onNet(Events.sendSystemMessage, this.EVENT_systemMsg.bind(this));
    onNet(Events.clearChat, this.EVENT_clearChat.bind(this));
    onNet(Events.freezeChat, this.EVENT_freezeChat.bind(this));
  }

  public init(): void {
    // Register NUI Callbacks & Chat Keybinds
    this.registerCallbacks();
    this.registerKeybinds();
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseChat, (data, cb) => {
      // Set chat statebag to closed
      const player = Player(GetPlayerServerId(Game.Player.Handle));
      player.state.set("chatOpen", false, true);
      console.log("Typing set to", player.state.chatOpen);

      SetNuiFocus(false, false);
      cb("ok");
    });
    
    RegisterNuiCallback(NuiCallbacks.SendMessage, (data, cb) => {
      SetNuiFocus(false, false);
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.sendMessage, {message: data.message, type: data.type}, (cbData) => {
        // console.log("RETURNED MSG CB", cbData);
        // SetNuiFocus(!cbData, !cbData);

        // Set chat statebag to closed
        const player = Player(GetPlayerServerId(Game.Player.Handle));
        player.state.set("chatOpen", false, true);
        console.log("Typing set to", player.state.chatOpen);

        cb(cbData)
        if (!cbData) this.chatState = ChatStates.Closed;
      }));
    });
  }

  private registerKeybinds(): void {
    // Chat Input Toggling
    // RegisterKeyMapping("open_chat", "Opens the chat", "keyboard", "T");
    RegisterCommand("+open_chat", () => {
      if (!IsPauseMenuActive()) {
        if (this.chatState != ChatStates.Hidden) {
          if (this.client.player.Rank >= Ranks.Admin) {
            // Set chat statebag to open
            const player = Player(GetPlayerServerId(Game.Player.Handle));
            player.state.set("chatOpen", true, true);
            console.log("Typing set to", player.state.chatOpen);

            // console.log("CAN OPEN CHAT EVEN IF ITS DISABLED AS YOUR STAFF");
            this.chatState = ChatStates.Open;
            SetNuiFocus(true, true);
            SendNuiMessage(JSON.stringify({
              event: NuiMessages.OpenChat,
              data: {
                toggle: true
              }
            }))
          } else {
            if (this.chatState != ChatStates.Disabled) {
              // Set chat statebag to open
              const player = Player(GetPlayerServerId(Game.Player.Handle));
              player.state.set("chatOpen", true, true);
              console.log("Typing set to", player.state.chatOpen);

              this.chatState = ChatStates.Open;
              SetNuiFocus(true, true);
              SendNuiMessage(JSON.stringify({
                event: NuiMessages.OpenChat,
                data: {
                  toggle: true
                }
              }))
            } else {
              // console.log("CANT OPEN CHAT AS ITS DISABLED BY STAFF!");
            }
          }
        }
        // else {
          // console.log("CANT OPEN CHAT AS ITS HIDDEN!");
        // }
      }
    }, false);

    // Chat Visibility Toggling
    // RegisterKeyMapping("toggle_chat", "Toggles chat", "keyboard", "home");
    RegisterCommand("+toggle_chat", async() => {
      if (!IsPauseMenuActive()) {
        if (this.chatState != ChatStates.Hidden) {
          this.chatState = ChatStates.Hidden;
          // console.log("CHAT HIDDEN!");
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.ToggleChat,
            data: {
              state: false
            }
          }));

          const notify = new Notification("Chat", "You have hidden the chat!", NotificationTypes.Error);
          await notify.send();
        } else {
          this.chatState = ChatStates.Closed;
          // console.log("CHAT SHOWING!");
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.ToggleChat,
            data: {
              state: true
            }
          }));

          const notify = new Notification("Chat", "You have toggled the chat!", NotificationTypes.Success);
          await notify.send();
        }
      }
    }, false);
  }

  public setupData(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SetupChat,
      data: {
        types: this.chatTypes
      }
    }))

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateSuggestions,
      data: {
        suggestions: this.chatSuggestions
      }
    }))
  }

  // Events
  private EVENT_setTypes(types: string[], UIUpdate: boolean): void {
    // console.log("Set Chat Types", types);
    this.chatTypes = types;

    if (UIUpdate) {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.SetupChat,
        data: {
          types: this.chatTypes
        }
      }))
    }
  }

  private EVENT_addSuggestion(suggestion: Suggestion): void {
    // console.log("Add Suggestion", suggestion.name, suggestion.description)
    // console.log(NuiMessages.AddSuggestion, JSON.stringify(`${suggestion.name} | ${suggestion.description} | ${suggestion.params}`));
    this.chatSuggestions.push(suggestion);
  }

  private EVENT_updateSuggestions(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateSuggestions,
      data: {
        suggestions: this.chatSuggestions
      }
    }))
  }

  private EVENT_removeSuggestions(): void {
    this.chatSuggestions = [];
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.UpdateSuggestions,
      data: {
        suggestions: this.chatSuggestions
      }
    }))
  }

  private EVENT_newMsg(message: Message, sender?: string): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SendMessage,
      data: {
        type: message.type,
        sender: sender,
        contents: message.content
      }
    }));
  }

  private EVENT_systemMsg(message: Message, sender?: string): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SendMessage,
      data: {
        type: "system",
        notificationType: message.type,
        contents: message.content,
        sender: sender,
      }
    }));
  }

  private EVENT_clearChat(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.ClearChat
    }))
  }

  private EVENT_freezeChat(freezeState: boolean): void {
    if (freezeState) {
      this.chatState = ChatStates.Disabled;
    } else {
      this.chatState = ChatStates.Closed;
    }
  }
}
