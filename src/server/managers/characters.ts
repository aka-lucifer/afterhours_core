import { Server } from "../server";
import {Dist, Inform, Log, logCommand, NumToVector3} from "../utils";

import { Player } from "../models/database/player";
import { Character } from "../models/database/character";
import WebhookMessage from "../models/webhook/discord/webhookMessage";
import { Command } from "../models/ui/chat/command";
import { Ban } from "../models/database/ban";

import { LogTypes } from "../enums/logging";

import * as Database from "../managers/database/database"

import { Callbacks } from "../../shared/enums/events/callbacks";
import { Events } from "../../shared/enums/events/events";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { Message } from "../../shared/models/ui/chat/message";
import { SystemTypes } from "../../shared/enums/ui/chat/types";
import { Ranks } from "../../shared/enums/ranks";

import sharedConfig from "../../configs/shared.json";
import serverConfig from "../../configs/server.json";
import { JobEvents } from "../../shared/enums/events/jobs/jobEvents";

export class CharacterManager {
  public server: Server;
  private characters: Character[] = [];
  private meDrawnings: meDrawing[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.createCharacter, this.CALLBACK_createCharacter.bind(this));
    onNet(Callbacks.editCharacter, this.CALLBACK_editCharacter.bind(this));
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
    new Command("characters", "Change your current logged in character", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);
      if (player) {
        if (player.Spawned) {
          player.Spawned = false;
          await player.TriggerEvent(Events.characterSpawned, false);
          emitNet(JobEvents.deleteOffDutyUnit, -1, player.Handle); // Remove this players on duty blip to all on duty players
          await player.TriggerEvent(JobEvents.deleteJobBlips); // Delete all on duty player blips for you
          await player.TriggerEvent(Events.displayCharacters, true);
        }
      }
    }, Ranks.User);

    new Command("me", "Send an action message locally & draws it over your head.", [{name: "content", help: "The content of your /me message."}], true, async(source: string, args: any[]) => {
      const messageContents = args.join(" ");
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (messageContents.length > 0) {
        if (player) {
          if (player.Spawned) {
            const character = await this.Get(player);
            
            if (character) {
              const sent = await this.proximityMessage(ProximityTypes.Me, new Message(messageContents, SystemTypes.Me), character);
              if (sent) {
                await this.meDrawing(parseInt(player.Handle), messageContents);
                await logCommand("/me", player, messageContents);
              }
            }
          }
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No message provided!", SystemTypes.Error));
      }
    }, Ranks.User);

    new Command("ad", "Send an advert to the server.", [{name: "content", help: "The content of your advert."}], true, async(source: string, args: any[]) => {
      const messageContents = args.join(" ");
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (messageContents.length > 0) {
        if (player) {
          if (player.Spawned) {
            const character = await this.Get(player);
            
            if (character) {
              await player.TriggerEvent(Events.sendSystemMessage, new Message(messageContents, SystemTypes.Advert), character.Name);
              await logCommand("/ad", player, messageContents);
            }
          }
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No message provided!", SystemTypes.Error));
      }
    }, Ranks.User);

    new Command("showid", "Show your ID to the closest players.", [], false, async(source: string) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (player) {
        if (player.Spawned) {
          const character = await this.Get(player);
          
          if (character) {
            await this.proximityMessage(ProximityTypes.ID, new Message(
              `^0Name: ^3${character.Name} ^0| DOB: ^3${character.DOB} ^0| Nationality: ^3${character.Nationality} ^0| Gender: ^3${character.Gender}`,
              SystemTypes.ID
            ), character);
          }
        }
      }
    }, Ranks.User);
  }

  public async proximityMessage(type: ProximityTypes, message: Message, character: Character): Promise<boolean> {
    if (type == ProximityTypes.Me) {
      const players = this.server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < players.length; i++) {
        const otherPlayer = players[i];
        const dist = character.Owner.Position.distance(otherPlayer.Position);

        if (dist <= 60.0) {
          await otherPlayer.TriggerEvent(Events.sendSystemMessage, message, character.Name);
        }
      }

      return true;
    } else if (type == ProximityTypes.ID) {
      const players = this.server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < players.length; i++) {
        const otherPlayer = players[i];
        const myPos = NumToVector3(GetEntityCoords(GetPlayerPed(character.Owner.Handle)));
        const otherPos = NumToVector3(GetEntityCoords(GetPlayerPed(otherPlayer.Handle)));

        const dist = Dist(myPos, otherPos, false);
        if (dist <= 10.0) {
          await otherPlayer.TriggerEvent(Events.sendSystemMessage, message);
        }
      }

      return true;
    } else if (type == ProximityTypes.Local) {
      const players = this.server.connectedPlayerManager.GetPlayers;

      for (let i = 0; i < players.length; i++) {
        const otherPlayer = players[i];
        const myPos = NumToVector3(GetEntityCoords(GetPlayerPed(character.Owner.Handle)));
        const otherPos = NumToVector3(GetEntityCoords(GetPlayerPed(otherPlayer.Handle)));

        const dist = Dist(myPos, otherPos, false);
        if (dist <= 60.0) {
          await otherPlayer.TriggerEvent(Events.sendClientMessage, message, character.Name);
        }
      }

      return true;
    }
  }

  public async Add(character: Character): Promise<number> {
    const addedData = this.characters.push(character);
    if (this.server.IsDebugging) Log("Character Manager (Add)", `[Char Id: ${character.Id}]: ${character.Name} | [Player Id: ${character.Owner.Handle}]: ${character.Owner.GetName}`);
    console.log("chars", this.characters)
    return addedData;
  }

  public async Exists(owner: Player): Promise<boolean> {
    const charIndex = this.characters.findIndex(character => character.Owner.Handle == owner.Handle);
    return charIndex !== -1;
  }

  public async Get(owner: Player): Promise<Character> {
    const charIndex = this.characters.findIndex(character => character.Owner.Handle == owner.Handle);
    if (charIndex != -1) {
      return this.characters[charIndex];
    }
  }

  public async getFromId(id: number): Promise<Character> {
    const charIndex = this.characters.findIndex(character => character.Id == id);
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
    const charIndex = this.characters.findIndex(character => character.Owner.Handle == owner.Handle);

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

  public Disconnect(owner: Player): void {
    const charIndex = this.characters.findIndex(character => character.Owner.Handle == owner.Handle);

    if (charIndex != -1) {
      const tempData = this.characters[charIndex];
      this.characters.splice(charIndex, 1);
      Inform("Character Manager", `[Char Id: ${tempData.Id}]: ${tempData.Name} | [Player Id: ${tempData.Owner.Handle}]: ${tempData.Owner.GetName} | Removed from character manager!`);
    }
  }

  public async meDrawing(sender: number, content: string): Promise<void> {
    this.meDrawnings.push(new meDrawing(sender, content));
    console.log(`Sync /me command | (${content}) by (${JSON.stringify(sender)})`);
    // sync to client
    emitNet(Events.syncMeMessages, -1, this.meDrawnings);

    // Allow to draw for this length
    setTimeout(async() => {
      const meIndex = this.meDrawnings.findIndex(drawing => drawing.By == sender && drawing.Content == content);
      if (meIndex != -1) {
        this.meDrawnings.splice(meIndex, 1);
        console.log(`Sync deleted /me content | (${content}) by (${JSON.stringify(sender)})`);
        emitNet(Events.syncMeMessages, -1, this.meDrawnings);
        // resync to client
      }
    }, serverConfig.characters.meCommand.drawLength);
  }

  // Callbacks
  private async CALLBACK_createCharacter(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (player) {
      const character = new Character(player.Id);
      const charData = data.data;
      
      // console.log("New Char Data", charData)
      const created = await character.create(charData.firstName, charData.lastName, charData.nationality, charData.backstory, charData.dob, charData.gender, charData.licenses, charData.mugshot);
      if (created) {
        player.characters.push(character);
        data.character = Object.assign({}, character);
        await player.TriggerEvent(Events.receiveServerCB, true, data);

        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Character Created__",
          description: `A player has created a new character.\n\n**Name**: ${character.Name}\n**Nationality**: ${character.Nationality}\n**Age**: ${character.Age}\n**Gender**: ${character.Gender}\n**Job**: ${JSON.stringify(character.Job, null, 4)}\n**Metadata**: ${JSON.stringify(character.Metadata, null, 4)}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]}));
      } else {
        console.log("error creating character!");
      }
    }
  }

  private async CALLBACK_editCharacter(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      const charData = data.data;

      if (charData.characterId !== undefined && charData.characterId > 0) {
        const yourCharacter = await this.Yours(charData.characterId, player);

        const character = new Character(player.Id);
        await character.load(data.characterId);

        if (yourCharacter) {
          const character = new Character(player.Id);
          const loadedCharacter = await character.load(charData.characterId)

          if (loadedCharacter) {
            character.firstName = charData.firstName;
            character.lastName = charData.lastName;
            character.nationality = charData.nationality;
            character.backstory = charData.backstory;
            if (charData.mugshot) character.Metadata.Mugshot = charData.mugshot;
            if (charData.licenses) character.Metadata.setLicenses(charData.licenses)

            const cb = {
              status: true,
              licenses: character.Metadata.Licenses
            }

            const updatedData = await character.update();
            if (updatedData) {
              await player.TriggerEvent(Events.receiveServerCB, cb, data); // Update the UI to close and disable NUI focus
              await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
                color: EmbedColours.Green,
                title: "__Character Edited__",
                description: `A player has logged in as a character.\n\n**Name**: ${character.Name}\n**Nationality**: ${character.Nationality}\n**Age**: ${character.Age}\n**Gender**: ${character.Gender}\n**Job**: ${JSON.stringify(character.Job, null, 4)}\n**Metadata**: ${JSON.stringify(character.Metadata, null, 4)}\n**Created At**: ${character.CreatedAt}\n**Last Edited**: ${character.LastEdited}`,
                footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
              }]}));
            }
          }
        } else {
          const ban = new Ban(player.Id, player.HardwareId, "Trying to edit someone else's character (Lua Executor)", player.Id);
          await ban.save();
          ban.drop();
          
          const discord = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({username: "Character Logs", embeds: [{
            color: EmbedColours.Red,
            title: "__Attempted Character Edit__",
            description: `A player has tried to edit someone else's character.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Character Name**: ${character.Name}\n**Character Job**: ${JSON.stringify(character.Job, null, 4)}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]}));
        }
      }
    }
  }

  private async CALLBACK_selectCharacter(data: Record<string, any>): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());

    if (data.characterId !== undefined && data.characterId > 0) {
      const character = new Character(player.Id);
      const loadedCharacter = await character.load(data.characterId)

      if (loadedCharacter) {
        character.Owner = player; // Make the character owned by you
        player.Spawned = true; // Set us spawned in with our spawn system

        await player.TriggerEvent(Events.setCharacter, Object.assign({}, character)); // Update our character on our client (char info, job, etc)
        await player.Notify("Characters", `You've logged in as ${character.Name}`, NotificationTypes.Success);

        // Set your selected character fuck thing
        player.selectedCharacter = {
          id: character.Id,
          firstName: character.firstName,
          lastName: character.lastName,
          nationality: character.nationality,
          backstory: character.backstory,
          dob: character.DOB,
          age: character.Age,
          isFemale: character.Female,
          phone: character.Phone,
          job: character.Job,
          metadata: character.Metadata,
          createdAt: character.CreatedAt,
          lastUpdated: character.LastEdited,
        };

        // Empty owned characters table, when you spawn in as a character
        player.characters = [];
        
        // Sync all players & selected characters to all clients
        emitNet(Events.syncPlayers, -1, Object.assign({}, this.server.connectedPlayerManager.connectedPlayers));

        // If your character hasn't made any vehicles notify them
        if (player.characters.length > 0) {
          await player.Notify("Vehicles", `Make sure to create your CAD/MDT vehicles with the /vehicles command.`, NotificationTypes.Info, 10000);
        }
        
        if (await this.Exists(player)) { // If one of your characters exists in the manager, remove it
          await this.Remove(player);
          await this.server.commandManager.deleteChatSuggestions(player);
        }

        await this.Add(character); // Add your character to the manager
        
        // Send all registered command suggestions to your client (Player, Staff, Jobs, General, etc)
        await this.server.commandManager.deleteChatSuggestions(player);
        this.server.commandManager.createChatSuggestions(player);
        await player.TriggerEvent(Events.updateSuggestions);

        const charVehicles = await this.server.charVehicleManager.GetCharVehicles(character);
        if (charVehicles) {
          await player.TriggerEvent(Events.setupVehicles, charVehicles);
        }
        await player.TriggerEvent(Events.receiveServerCB, true, data); // Update the UI to close and disable NUI focus

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
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
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
            description: `A player has deleted one of their characters.\n\n**Player Name**: ${player.GetName}\n**Player Rank**: ${Ranks[player.Rank]}\n**Character ID**: ${character.Id}\n**Character Name**: ${character.Name}\n**Character Job**: ${JSON.stringify(character.Job, null, 4)}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}`,
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

export enum ProximityTypes {
  Local,
  Me,
  ID
}

export class meDrawing {
  private drawedBy: number;
  private content: string;

  constructor(drawer: number, content: string) {
    this.drawedBy = drawer;
    this.content = content;
  }

  // Getters
  public get By(): number {
    return this.drawedBy;
  }

  public get Content(): string {
    return this.content;
  }
}
