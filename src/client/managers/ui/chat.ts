import {Client} from "../../client";
import {RegisterNuiCallback} from "../../utils";

import {ServerCallback} from "../../models/serverCallback";

import {Message} from "../../../shared/models/ui/chat/message";
import {NuiCallbacks} from "../../../shared/enums/ui/chat/nuiCallbacks";
import {NuiMessages} from "../../../shared/enums/ui/chat/nuiMessages";
import {Events} from "../../../shared/enums/events";
import {Ranks} from "../../../shared/enums/ranks";
import {Callbacks} from "../../../shared/enums/callbacks";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";
import {ChatTypes} from "../../../shared/enums/ui/chat/types";
import {ChatStates} from "../../enums/ui/chat/chatStates";

export class ChatManager {
  private client: Client;
  private chatTypes: string[] = [];
  private chatState: ChatStates = ChatStates.Closed;
  
  constructor (client) {
    this.client = client;
    console.log("STARTED CHAT MANAGER!");

    // Events
    onNet(Events.addSuggestion, this.EVENT_addSuggestion.bind(this));
    onNet(Events.sendClientMessage, this.EVENT_newMsg.bind(this))
    onNet(Events.sendSystemMessage, this.EVENT_systemMsg.bind(this));
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
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.sendMessage, {message: data.message, type: data.type}, (cbData) => {
        // console.log("RETURNED MSG CB", cbData);
        SetNuiFocus(!cbData, !cbData)
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
        if (this.chatState != ChatStates.Hidden && this.chatState != ChatStates.Disabled) {
          this.chatState = ChatStates.Open;
          SetNuiFocus(true, true);
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.OpenChat,
            data: {
              toggle: true
            }
          }))
        } else {
          console.log("Chat is hidden or disabled!");
        }
      }
    }, false);

    // Chat Visibility Toggling
    RegisterKeyMapping("toggle_chat", "Toggles chat", "keyboard", "insert");
    RegisterCommand("toggle_chat", () => {
      if (!IsPauseMenuActive()) {
        if (this.chatState != ChatStates.Hidden) {
          this.chatState = ChatStates.Hidden;
          console.log("CHAT HIDDEN!");
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.ToggleChat,
            data: {
              state: false
            }
          }))
        } else {
          this.chatState = ChatStates.Closed;
          console.log("CHAT SHOWING!");
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

  public setup(): void {
    if (this.chatTypes.length <= 0) {
      Object.keys(ChatTypes).forEach(type => {
        const chatType = parseInt(type);
        if (!isNaN(chatType)) {
          const stringType = ChatTypes[chatType].toLowerCase();
          if (stringType != "system" && stringType != "admin") {
            this.chatTypes.push(stringType);
          }
        }
      });

      if (this.client.player.Rank >= Ranks.Admin) this.chatTypes.push("admin");
    }

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SetupChat,
      data: {
        types: this.chatTypes
      }
    }))
  }

  // Events
  private EVENT_addSuggestion(suggestion: Suggestion): void {
    console.log("Add Suggestion", suggestion)
    console.log(NuiMessages.AddSuggestion, JSON.stringify(`${suggestion.name} | ${suggestion.description} | ${suggestion.commandParams}`));
    setTimeout(() => {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.AddSuggestion,
        data: {
          name: suggestion.name,
          description: suggestion.description,
          params: suggestion.commandParams
        }
      }))
    }, 0);
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
}
