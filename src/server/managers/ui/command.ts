import {Server} from "../../server";

import {Command} from "../../models/ui/chat/command";
import {Player} from "../../models/database/player";

import {Events} from "../../../shared/enums/events";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";

export class CommandManager {
  private server: Server;
  private registeredCommands: Command[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Methods
  public get Commands(): Command[] {
    return this.registeredCommands;
  }

  // Methods
  public addCommand(command: Command): void {
    this.registeredCommands.push(command);
  }

  public createChatSuggestions(player: Player): void {
    this.registeredCommands.forEach((command, index) => {
      if (player.GetRank >= command.permission) {
        command.argsRequired ? player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description, command.args)) : player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description));
      }
    });
  }
}
