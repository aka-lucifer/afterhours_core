import { Client } from "../../client";
import { RegisterNuiCallback } from "../../utils";

import { ServerCallback } from "../../models/serverCallback";

import {Message} from "../../../shared/models/ui/chat/message";
import {NuiCallbacks} from "../../../shared/enums/ui/chat/nuiCallbacks";
import {NuiMessages} from "../../../shared/enums/ui/chat/nuiMessages";
import {Events} from "../../../shared/enums/events";
import {Ranks} from "../../../shared/enums/ranks";
import { Callbacks } from "../../../shared/enums/callbacks";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";
import {ChatTypes} from "../../../shared/enums/ui/chat/types";

export class ChatManager {
  private client: Client;
  private chatTypes: string[] = ["local", "global"];
  
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
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.sendMessage, {message: data.message, type: data.type}, (cbData, passedData) => {
        // console.log("RETURNED MSG CB", cbData, passedData);
        SetNuiFocus(!cbData, !cbData)
        cb(cbData)
      }));
    });
  }

  private registerKeybinds(): void {
    // Chat Input Toggling
    RegisterKeyMapping("toggle_chat", "Toggles chat input", "keyboard", "T");
    RegisterCommand("toggle_chat", () => {
      if (!IsPauseMenuActive()) {
        SetNuiFocus(true, true);
        SendNuiMessage(JSON.stringify({
          event: NuiMessages.ToggleChat,
          data: {
            toggle: true
          }
        }))
      }
    }, false);
  }

  public setup(): void {
    const chatTypes = [];
    Object.keys(ChatTypes).forEach((type, index) => {
      const chatType = parseInt(type);
      if (!isNaN(chatType)) {
        const stringType = ChatTypes[chatType].toLowerCase();
        if (stringType != "system" && stringType != "admin") {
          chatTypes.push(stringType);
        }
      }
    });

    if (this.client.player.Rank >= Ranks.Admin) chatTypes.push("admin");

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SetupChat,
      data: {
        types: chatTypes
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
