import { Server } from "../../server";
import { Player } from "../../models/database/player";
import { Command } from "../../models/ui/command";
import { ChatLog } from "../../models/ui/chatLog";
import { Events } from "../../../shared/enums/events";
import { Ranks } from "../../../shared/enums/ranks";
import { Dist, Log, Inform, Error, GetHash } from "../../utils";

export class ChatManager {
  private server: Server;
  private registeredCommands: Command[] = [];

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.onMessage, async(sender, author, text) => {
      if (GetPlayerName(sender) == author) {
        const player = await this.server.playerManager.GetPlayer(sender);

        if (server.IsDebugging) Inform("Message Sent", JSON.stringify(text));
        if (text.includes("/")) { // If it's a command
          const args = String(text).replace("/", "").split(" "); // All of the arguments of the message
          const command = args[0].toLowerCase();

          if (this.registeredCommands.filter(cmd => cmd.name == command).length <= 0) {
            Error("Chat Manager", `Command (/${command}) doesn't exist!`)
            return;
          } else {
            args.splice(0, 1); // Remove the first argument (the command) from the args table.
            CancelEvent();
    
            for (let a = 0; a < this.registeredCommands.length; a++) {
              if (command == this.registeredCommands[a].name) {
                if (player.GetRank >= this.registeredCommands[a].permission) {
                  if (this.registeredCommands[a].argsRequired) {
                    if (Object.keys(this.registeredCommands[a].args).length > 0 && args.length >= Object.keys(this.registeredCommands[a].args).length) {
                      this.registeredCommands[a].callback(player.GetHandle, args);
                    } else {
                      Error("Chat Manager", "All command arguments must be entered!")
                    }
                  } else {
                    this.registeredCommands[a].callback(player.GetHandle, args);
                  }
                } else {
                  Error("Chat Manager", "Access Denied!");
                }
              }
            }
          }
        } else {
          // do blacklist check in here
          // proximity chat here if nothing passed.
          // roles before names

          const chatLog = new ChatLog(player, text);
          await chatLog.Store();
        }
      }
    });
  }

  // Methods
  public addCommand(command: Command): void {
    this.registeredCommands.push(command);
  }

  public createChatSuggestions(): void {
    this.registeredCommands.forEach(command => {
      command.argsRequired ? emitNet(Events.chatSuggestion, -1, `/${command.name}`, command.description, command.args) : emitNet(Events.chatSuggestion, -1, `/${command.name}`, command.description);
    });
  }
}
