import { Server } from "../server";
import {Dist, Inform, Log, logCommand, NumToVector3} from "../utils";

import { Player } from "../models/database/player";
import { Character } from "../models/database/character";
import WebhookMessage from "../models/webhook/discord/webhookMessage";
import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";

import { LogTypes } from "../enums/logTypes";

import * as Database from "../managers/database/database"

import { Callbacks } from "../../shared/enums/events/callbacks";
import { Events } from "../../shared/enums/events/events";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../shared/enums/embedColours";
import { Message } from "../../shared/models/ui/chat/message";
import { SystemTypes } from "../../shared/enums/ui/types";
import { Ranks } from "../../shared/enums/ranks";

import sharedConfig from "../../configs/shared.json";

export class CharacterManager {
  public server: Server;
  private characters: Character[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.selectCharacter, this.CALLBACK_selectCharacter.bind(this));
    onNet(Callbacks.deleteCharacter, this.CALLBACK_deleteCharacter.bind(this));
  }

  // Get Requests
  public get GetCharacters(): Character[] {
    return this.characters;
  }

  // Methods
  public init(): void {
    this.registerCommands();
  }

  private registerCommands(): void {
    new Command("me", "Send an action message locally & draws it over your head.", [{name: "content", help: "The content of your /me message."}], true, async(source: string, args: any[]) => {
      const messageContents = args.join(" ");
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (messageContents.length > 0) {
        if (player) {
          const character = await this.Get(player);
          
          if (character) {
            const sent = await this.proximityMessage(ProximityTypes.Me, new Message(messageContents, SystemTypes.Me), character);
            if (sent) {
              await logCommand("/me", player, messageContents);
            }
          }
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No message provided!", SystemTypes.Error));
      }
    }, Ranks.User);
  }

  public async proximityMessage(type: ProximityTypes, message: Message, character: Character): Promise<boolean> {
    if (type == ProximityTypes.Me) {
      const players = this.server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < players.length; i++) {
        const otherPlayer = players[i];
        const myPos = NumToVector3(GetEntityCoords(GetPlayerPed(character.Owner.GetHandle)));
        const otherPos = NumToVector3(GetEntityCoords(GetPlayerPed(otherPlayer.GetHandle)));

        const dist = Dist(myPos, otherPos, false);
        Log("Proximity Message", `My Position: ${JSON.stringify(myPos)} | Other Position: ${JSON.stringify(otherPos)} | Dist: ${dist}`);

        if (dist <= 60.0) {
          Inform("Proximity Message", `Player (${otherPlayer.GetName}) is close enough to recieve the proximity message sent from (${character.Owner.GetName})`);
          await character.Owner.TriggerEvent(Events.sendSystemMessage, message, character.Name);
        }
      }

      return true;
    }
  }

  public async Add(character: Character): Promise<number> {
    const addedData = this.characters.push(character);
    if (this.server.IsDebugging) Log("Character Manager (Add)", `[Char Id: ${character.Id}]: ${character.Name} | [Player Id: ${character.Owner.GetHandle}]: ${character.Owner.GetName}`);
    return addedData;
  }

  public async Exists(owner: Player): Promise<boolean> {
    const charIndex = this.characters.findIndex(character => character.Owner.Id == owner.Id);
    return charIndex !== -1;
  }

  public async Get(owner: Player): Promise<Character> {
    const charIndex = this.characters.findIndex(character => character.Owner.Id == owner.Id);
    if (charIndex != -1) {
      return this.characters[charIndex];
    }
  }

  public async Yours(charId: number, owner: Player): Promise<boolean> {
    const charData = await Database.SendQuery("SELECT `id` FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: charId,
      playerId: owner.Id
    });

    return charData.data.length > 0;
  }

  public async Delete(charId: number, owner: Player): Promise<boolean> {
    const charData = await Database.SendQuery("DELETE FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: charId,
      playerId: owner.Id
    });

    return charData.data.length > 0;
  }

  public async Remove(owner: Player): Promise<void> {
    const charIndex = this.characters.findIndex(character => character.Owner.Id == owner.Id);

    if (charIndex != -1) {
      const tempData = this.characters[charIndex];
      this.characters.splice(charIndex, 1);

      await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
        color: EmbedColours.Red,
        title: "__Character Removed__",
        description: `A player has logged out as a character.\n\n**Name**: ${tempData.Name}\n**Nationality**: ${tempData.Nationality}\n**Age**: ${tempData.Age}\n**Gender**: ${tempData.Gender}\n**Job**: ${JSON.stringify(tempData.Job, null, 4)}\n**Metadata**: ${JSON.stringify(tempData.Metadata, null, 4)}\n**Created At**: ${tempData.CreatedAt}\n**Last Edited**: ${tempData.LastEdited}`,
        footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
      }]}));
    }
  }

  public async Disconnect(owner: Player): Promise<void> {
    const charIndex = this.characters.findIndex(character => character.Owner.Id == owner.Id);

    if (charIndex != -1) {
      const tempData = this.characters[charIndex];
      this.characters.splice(charIndex, 1);
      Inform("Character Manager", `[Char Id: ${tempData.Id}]: ${tempData.Name} | [Player Id: ${tempData.Owner.GetHandle}]: ${tempData.Owner.GetName} | Removed from character manager!`);
    }
  }

  // Callbacks
  private async CALLBACK_selectCharacter(data: Record<string, any>): Promise<void> {
    const src = source;
    const player = await this.server.connectedPlayerManager.GetPlayer(src);

    if (data.characterId !== undefined && data.characterId > 0) {
      const startTime = new Date();
      const character = new Character(player.Id);
      const loadedCharacter = await character.load(data.characterId)

      if (loadedCharacter) {
        character.Owner = player; // Make the character owned by you
        player.Spawned = true;
        await player.TriggerEvent(Events.receiveServerCB, true, data);
        await player.Notify("Characters", `You've logged in as ${character.Name}`, NotificationTypes.Success);
        
        if (await this.Exists(player)) {
          await this.Remove(player);
        }

        await this.Add(character);

        // Log it to discord
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Character Selected__",
          description: `A player has logged in as a character.\n\n**Name**: ${character.Name}\n**Nationality**: ${character.Nationality}\n**Age**: ${character.Age}\n**Gender**: ${character.Gender}\n**Job**: ${JSON.stringify(character.Job, null, 4)}\n**Metadata**: ${JSON.stringify(character.Metadata, null, 4)}\n**Created At**: ${character.CreatedAt}\n**Last Edited**: ${character.LastEdited}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        console.log("UNABLE TO LOAD!");
      }
    } else {
      await player.TriggerEvent(Events.receiveServerCB, false, data);
      await player.Notify(
        "Characters", 
        "Character not found, make a support ticket on the website with your characters full name and DOB, and a developer will get back to you ASAP!",
        NotificationTypes.Error
      );
    }
  }

  // Events
  private async CALLBACK_deleteCharacter(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      if (data.characterId !== undefined && data.characterId > 0) {
        const yourCharacter = await this.Yours(data.characterId, player);

        const character = new Character(player.Id);
        await character.load(data.characterId);

        if (yourCharacter) {

          await player.TriggerEvent(Events.receiveServerCB, true, data);
          await this.Delete(data.characterId, player);
          
          const discord = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Character Deleted__",
            description: `A player has deleted on of their characters.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Character Name**: ${character.Name}\n**Character Job**: ${JSON.stringify(character.Job, null, 4)}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        } else {
          const ban = new Ban(player.Id, player.HardwareId, "Trying to delete someone else's character (Lua Executor)", player.Id);
          await ban.save();
          ban.drop();
          
          const discord = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Attempted Character Deletion__",
            description: `A player has tried to delete someone else's character.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Character Name**: ${character.Name}\n**Character Job**: ${JSON.stringify(character.Job, null, 4)}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      } else {
        await player.TriggerEvent(Events.receiveServerCB, false, data);
      }
    } else {
      await player.TriggerEvent(Events.receiveServerCB, false, data);
    }
  }
}

enum ProximityTypes {
  Me
}