import {Server} from "../../server";
import { Dist, Log, Inform, Error, NumToVector3 } from "../../utils";
import {LogTypes} from "../../enums/logTypes";

import { ChatLog } from "../../models/ui/chat/chatLog";
import WebhookMessage from "../../models/webhook/discord/webhookMessage";

import { Message } from "../../../shared/models/ui/chat/message";
import { Events } from "../../../shared/enums/events";
import { Ranks } from "../../../shared/enums/ranks";
import {ChatTypes} from "../../../shared/enums/ui/chat/types";
import { Callbacks } from "../../../shared/enums/callbacks";
import {EmbedColours} from "../../../shared/enums/embedColours";
import sharedConfig from "../../../configs/shared.json";

export class ChatManager {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.sendMessage, async(data: Record<string, any>) => {
      const src = source;
      const player = await this.server.playerManager.GetPlayer(src);
      const message = new Message(data.message, data.type);

      if (server.IsDebugging) Inform("Message Sent", JSON.stringify(message));
      if (message.content.includes("/")) { // If it's a command
        const args = String(message.content).replace("/", "").split(" "); // All of the arguments of the message
        const command = args[0].toLowerCase();
        const registeredCommands = this.server.commandManager.Commands;

        if (registeredCommands.filter(cmd => cmd.name == command).length <= 0) {
          Error("Chat Manager", `Command (/${command}) doesn't exist!`)
          emitNet(Events.receiveServerCB, src, false, data);
          return;
        } else {
          args.splice(0, 1); // Remove the first argument (the command) from the args table.
          CancelEvent();
  
          for (let a = 0; a < registeredCommands.length; a++) {
            if (command == registeredCommands[a].name) {
              if (player.GetRank >= registeredCommands[a].permission) {
                if (registeredCommands[a].argsRequired) {
                  if (Object.keys(registeredCommands[a].args).length > 0 && args.length >= Object.keys(registeredCommands[a].args).length) {
                    registeredCommands[a].callback(player.GetHandle, args);
                    emitNet(Events.receiveServerCB, src, true, data);
                  } else {
                    Error("Chat Manager", "All command arguments must be entered!")
                    emitNet(Events.receiveServerCB, src, false, data);
                  }
                } else {
                  registeredCommands[a].callback(player.GetHandle, args);
                  emitNet(Events.receiveServerCB, src, true, data);
                }
              } else {
                Error("Chat Manager", "Access Denied!");
                emitNet(Events.receiveServerCB, src, false, data);
              }
            }
          }
        }
      } else {
        const connectedPlayers = this.server.playerManager.GetPlayers;

        if (message.type == ChatTypes.Admin) {
          for (let i = 0; i < connectedPlayers.length; i++) {
            const otherPlayer = connectedPlayers[i];
            // console.log(`[${otherPlayer.GetHandle}: ${JSON.stringify(otherPlayer)}`);

            if (otherPlayer.GetRank >= Ranks.Admin) {
              await connectedPlayers[i].TriggerEvent(Events.sendClientMessage, message, player.GetName);
            }
          }
          emitNet(Events.receiveServerCB, src, true, data);
        } else if (message.type == ChatTypes.Local) {
          for (let i = 0; i < connectedPlayers.length; i++) {
            const otherPlayer = connectedPlayers[i];
            const myPos = NumToVector3(GetEntityCoords(GetPlayerPed(player.GetHandle)));
            const otherPos = NumToVector3(GetEntityCoords(GetPlayerPed(otherPlayer.GetHandle)));

            const dist = Dist(myPos, otherPos, false);
            Log("Proximity Message", `My Position: ${JSON.stringify(myPos)} | Other Position: ${JSON.stringify(otherPos)} | Dist: ${dist}`);

            if (dist <= 60.0) {
              Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${player.GetName})`);
              await otherPlayer.TriggerEvent(Events.sendClientMessage, message, player.GetName);
            }
          }
          emitNet(Events.receiveServerCB, src, true, data);
        } else {
          emitNet(Events.sendClientMessage, -1, message, player.GetName);
          emitNet(Events.receiveServerCB, src, true, data);
        }

        // do blacklist check in here
        // proximity chat here if nothing passed.
        // roles before names

        const chatLog = new ChatLog(player, message);
        await chatLog.Store();

        const sendersDisc = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Chat, new WebhookMessage({username: "Chat Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Chat Message__",
            description: `A player has sent a chat message.\n\n**Message**: ${message.content}\n**Type**: ${ChatTypes[message.type]}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      }
    });
  }
}
