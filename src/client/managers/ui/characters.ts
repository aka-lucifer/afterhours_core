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
    onNet(Events.setupCharacters, this.EVENT_setupCharacters.bind(this));
    onNet(Events.displayCharacters, this.EVENT_displayCharacters.bind(this));
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.SelectCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.selectCharacter, {characterId: data.characterId}, (cbData, passedData) => {
        SetNuiFocus(!cbData, !cbData);
        cb(cbData);
      }));
    });
  }

  // Events
  private EVENT_setupCharacters(characters: any[]): void {
    const myChars = [];

    for (let i = 0; i < characters.length; i++) {
      const character = new Character(characters[i]);
      myChars.push(character);
    }

    this.myCharacters = myChars;

    setTimeout(() => { // Double check that NUI is loaded & send chars over to UI
      this.sendCharacters();
    }, 500);
  }

  private sendCharacters(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.SetupCharacters,
      data: {
        characters: this.myCharacters
      }
    }));
  }

  public EVENT_displayCharacters(): void {
    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.DisplayCharacter
    }));
  }
}