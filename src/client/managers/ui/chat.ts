import {Client} from "../../client";
import {RegisterNuiCallback} from "../../utils";

import {ServerCallback} from "../../models/serverCallback";

import {Message} from "../../../shared/models/ui/chat/message";
import {NuiCallbacks} from "../../../shared/enums/ui/nuiCallbacks";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {Events} from "../../../shared/enums/events/events";
import {Ranks} from "../../../shared/enums/ranks";
import {Callbacks} from "../../../shared/enums/events/callbacks";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";
import {ChatTypes} from "../../../shared/enums/ui/types";
import {ChatStates} from "../../enums/ui/chat/chatStates";

export class ChatManager {
  private client: Client;
  private chatTypes: string[] = [];
  private chatSuggestions: Suggestion[] = [];
  private chatState: ChatStates = ChatStates.Closed;
  
  constructor (client) {
    this.client = client;
    console.log("STARTED CHAT MANAGER!");

    // Events
    onNet(Events.setTypes, this.EVENT_setTypes.bind(this));
    onNet(Events.addSuggestion, this.EVENT_addSuggestion.bind(this));
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
      SetNuiFocus(false, false);
      cb("ok");
    });
    
    RegisterNuiCallback(NuiCallbacks.SendMessage, (data, cb) => {
      SetNuiFocus(false, false);
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.sendMessage, {message: data.message, type: data.type}, (cbData) => {
        // console.log("RETURNED MSG CB", cbData);
        // SetNuiFocus(!cbData, !cbData);
        cb(cbData)
        if (!cbData) this.chatState = ChatStates.Closed;
      }));
    });
  }

  private registerKeybinds(): void {
    // Chat Input Toggling
    RegisterKeyMapping("open_chat", "Opens the chat", "keyboard", "T");
    RegisterCommand("open_chat", () => {
      if (!IsPauseMenuActive()) {
        if (this.chatState != ChatStates.Hidden) {
          if (this.client.player.Rank >= Ranks.Admin) {
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
    RegisterKeyMapping("toggle_chat", "Toggles chat", "keyboard", "insert");
    RegisterCommand("toggle_chat", () => {
      if (!IsPauseMenuActive()) {
        if (this.chatState != ChatStates.Hidden) {
          this.chatState = ChatStates.Hidden;
          // console.log("CHAT HIDDEN!");
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.ToggleChat,
            data: {
              state: false
            }
          }))
        } else {
          this.chatState = ChatStates.Closed;
          // console.log("CHAT SHOWING!");
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.ToggleChat,
            data: {
              state: true
            }
          }))
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
      event: NuiMessages.AddSuggestions,
      data: {
        suggestions: this.chatSuggestions
      }
    }))
  }

  // Events
  private EVENT_setTypes(types: string[]): void {
    console.log("Set Chat Types", types);
    this.chatTypes = types;
  }

  private EVENT_addSuggestion(suggestion: Suggestion): void {
    console.log("Add Suggestion", suggestion.name, suggestion.description)
    // console.log(NuiMessages.AddSuggestion, JSON.stringify(`${suggestion.name} | ${suggestion.description} | ${suggestion.params}`));
    this.chatSuggestions.push(suggestion);
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
