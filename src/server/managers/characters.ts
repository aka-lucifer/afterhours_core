import { Server } from "../server";
import { Character } from "../models/database/character";
import {Inform, Log} from "../utils";
import { Callbacks } from "../../shared/enums/events/callbacks";
import { Events } from "../../shared/enums/events/events";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";

export class CharacterManager {
  public server: Server;
  private characters: Character[] = [];
  
  constructor(server: Server) {
    this.server = server;

    // Callbacks
    onNet(Callbacks.selectCharacter, this.CALLBACK_selectCharacter.bind(this));
  }

  // Get Requests
  public get GetCharacters(): Character[] {
    return this.characters;
  }

  // Methods
  public Add(character: Character): number {
    const addedData = this.characters.push(character);
    if (this.server.IsDebugging) Log("Character Manager (Add)", `[Char Id: ${character.Id}]: ${character.Name} | [Player Id: ${character.Owner.GetHandle}]: ${character.Owner.GetName}`);
    return addedData;
  }

  public async Exists(playerHandle: string): Promise<boolean> {
    const charIndex = this.characters.findIndex(character => parseInt(character.Owner.GetHandle) == parseInt(playerHandle));
    return charIndex !== -1;
  }

  public async Get(playerHandle: string): Promise<Character> {
    const charIndex = this.characters.findIndex(character => parseInt(character.Owner.GetHandle) == parseInt(playerHandle));
    if (charIndex != -1) {
      return this.characters[charIndex];
    }
  }

  public async Remove(playerHandle: string): Promise<void> {
    const charIndex = this.characters.findIndex(character => parseInt(character.Owner.GetHandle) == parseInt(playerHandle));

    if (charIndex != -1) {
      this.characters.splice(charIndex, 1);
    }
  }

  public async Disconnect(playerHandle: string): Promise<void> {
    const charIndex = this.characters.findIndex(character => parseInt(character.Owner.GetHandle) == parseInt(playerHandle));

    if (charIndex != -1) {
      const tempData = this.characters[charIndex];
      this.characters.splice(charIndex, 1);
      Inform("Character Manager", `[Char Id: ${tempData.Id}]: ${tempData.Name} | [Player Id: ${tempData.Owner.GetHandle}]: ${tempData.Owner.GetName} | Removed from character manager!`);
    }
  }

  // Callbacks
  private async CALLBACK_selectCharacter(data: Record<string, any>) {
    const src = source;
    const player = await this.server.connectedPlayerManager.GetPlayer(src);

    if (data.characterId !== undefined && data.characterId > 0) {
      const character = new Character(player.Id);
      const loadedCharacter = await character.load(data.characterId)

      if (loadedCharacter) {
        character.Owner = player; // Make the character owned by you
        if (await this.Exists(player.GetHandle)) {
          await this.Remove(player.GetHandle);
        }

        this.Add(character);
        await player.TriggerEvent(Events.receiveServerCB, true, data);
        await player.Notify("Characters", `You've logged in as ${character.Name}`, NotificationTypes.Success);
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
}
