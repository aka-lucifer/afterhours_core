import {Server} from "../../server";

import {Command, JobCommand} from "../../models/ui/chat/command";
import {Player} from "../../models/database/player";

import {Events} from "../../../shared/enums/events/events";
import {Suggestion} from "../../../shared/models/ui/chat/suggestion";
import { Jobs } from '../../../shared/enums/jobs/jobs';

export class CommandManager {
  private server: Server;


  private registeredCommands: Command[] = [];
  private registeredJobCommands: JobCommand[] = [];

  constructor(server: Server) {
    this.server = server;
  }

  // Get Methods
  public get Commands(): Command[] {
    return this.registeredCommands;
  }
  
  public get JobCommands(): JobCommand[] {
    return this.registeredJobCommands;
  }

  // Methods
  public addCommand(command: Command): void {
    this.registeredCommands.push(command);
  }
  
  public addJobCommand(command: JobCommand): void {
    this.registeredJobCommands.push(command);
  }

  public createChatSuggestions(player: Player): void {
    this.registeredCommands.forEach(async(command, index) => {
      if (player.Rank >= command.permission) {
        command.argsRequired || Object.keys(command.args).length > 0 ? await player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description, command.args)) : await player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description));
      }
    });

    this.registeredJobCommands.forEach(async(command, index) => {
      let hasPermission = false;

      if (typeof command.permission == "object") {
        const permissionIndex = command.permission.findIndex(permission => permission == player.selectedCharacter.job.name);
        hasPermission = permissionIndex !== -1;
      } else {
        hasPermission = player.selectedCharacter.job.name == command.permission;
      }

      if (hasPermission) {
        command.argsRequired || Object.keys(command.args).length > 0 ? await player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description, command.args)) : await player.TriggerEvent(Events.addSuggestion, new Suggestion(command.name, command.description));
      }
    });
  }

  public async deleteChatSuggestions(player: Player): Promise<void> {
    await player.TriggerEvent(Events.removeSuggestions)
  }
}
