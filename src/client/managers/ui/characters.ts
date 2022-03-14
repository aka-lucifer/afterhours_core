import { Client } from "../../client";
import { RegisterNuiCallback } from "../../utils";

import { Character } from "../../models/character"
import { ServerCallback } from "../../models/serverCallback";

import { Events } from "../../../shared/enums/events/events";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Callbacks } from "../../../shared/enums/events/callbacks";

export class Characters {
  private client: Client;
  private myCharacters: Character[];

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.registerCallbacks();

    // Events
    onNet(Events.receiveCharacters, this.EVENT_receiveCharacters.bind(this));
    onNet(Events.displayCharacters, this.displayCharacters.bind(this));
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CreateCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.createCharacter, {data}, (cbData, passedData) => {
        cb(passedData.character)
      }));
    });

    RegisterNuiCallback(NuiCallbacks.EditCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.editCharacter, {data}, (cbData, passedData) => {
        cb(cbData)
      }));
    });

    RegisterNuiCallback(NuiCallbacks.SelectCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.selectCharacter, {characterId: data.characterId}, (cbData, passedData) => {
        if (cbData) {
          this.client.player.Spawned = true;
        }
        
        SetNuiFocus(!cbData, !cbData);
        cb(cbData);
      }));
    });
    
    RegisterNuiCallback(NuiCallbacks.DeleteCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.deleteCharacter, {characterId: data.characterId}, (cbData, passedData) => {
        cb(cbData)
      }));
    });
  }

  // Events
  private EVENT_receiveCharacters(characters: any[]): void {
    const myChars = [];

    for (let i = 0; i < characters.length; i++) {
      const character = new Character(characters[i]);
      myChars.push(character);
    }

    // console.log("Recieved Chars", myChars);
    this.myCharacters = myChars;
  }

  public displayCharacters(nuiFocus: boolean): void {
    // console.log("Send chars to UI!");
    if (nuiFocus) SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.DisplayCharacters,
      data: {
        characters: this.myCharacters
      }
    }));
  }
}