import { Client } from "../../client";
import { Delay, Draw3DText, NumToVector3, RegisterNuiCallback } from "../../utils";

import { Character } from "../../models/character"
import { ServerCallback } from "../../models/serverCallback";

import { Events } from "../../../shared/enums/events/events";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import { Ped, Game, Font, Vector3 } from "fivem-js";

export class Characters {
  private client: Client;
  private myCharacters: Character[];

  // /me 3D text
  private meMessages: any[] = [];
  private meTick: number = undefined;
  private meWaiter: number = 500;
  private atLocation: boolean = false;

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.registerCallbacks();

    // Events
    onNet(Events.receiveCharacters, this.EVENT_receiveCharacters.bind(this));
    onNet(Events.displayCharacters, this.displayCharacters.bind(this));
    onNet(Events.syncMeMessages, this.EVENT_syncMeMessages.bind(this));
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
        if (cbData.status) {
          cb(cbData.licenses)
        }
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

  private async EVENT_syncMeMessages(messages: any[]): Promise<void> {
    this.meMessages = messages;
    console.log("MESSAGES ARE NOW THIS YE FAT JEW FUCK!", JSON.stringify(messages));

    if (this.meMessages.length > 0) {
      if (this.meTick == undefined) {
        this.meTick = setTick(async() => {
          for (let i = 0; i < this.meMessages.length; i++) {
            const ped = new Ped(GetPlayerPed(GetPlayerFromServerId(this.meMessages[i].drawedBy)));

            if (ped) {
              if (ped.Position.distance(Game.PlayerPed.Position) < 10.0 && HasEntityClearLosToEntity(ped.Handle, Game.PlayerPed.Handle, 17)) {
                console.log("close!");
                const position = NumToVector3(GetOffsetFromEntityInWorldCoords(ped.Handle, 0.0, 0.0, 1.0));
                Draw3DText(position, {r: 170, g: 0, b: 255, a: 255}, this.meMessages[i].content, Font.ChaletLondon, false, 0.4, true);
              } else {
                console.log("far enough!");
              }
            }
          }


          if (this.meMessages.length <= 0) {
            clearTick(this.meTick);
            this.meTick = undefined;

            console.log("Clear 3d me text tick!");
          }

          // await Delay(0);
        });
      }
    }
  }

  // Methods
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