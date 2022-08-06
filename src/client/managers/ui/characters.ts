import { Ped, Game, Font, Vector3 } from "fivem-js";
import { Client } from "../../client";
import { Delay, Draw3DText, RegisterNuiCallback } from "../../utils";

import { Character } from "../../models/character"
import { ServerCallback } from "../../models/serverCallback";

import { Events } from "../../../shared/enums/events/events";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { Callbacks } from "../../../shared/enums/events/callbacks";
import { NumToVector3 } from "../../../shared/utils";

import clientConfig from "../../../configs/client.json";

interface meDrawing {
  id: number,
  netId: number,
  content: string,
  tick: number
}

export class Characters {
  private client: Client;
  private myCharacters: Character[];

  // /me 3D text
  private meMessages: meDrawing[] = [];
  private calculatorTick: number = undefined;
  private displayTick: number = undefined;
  private meWaiter: number = 500;
  private mePosition: Vector3 = undefined;

  constructor(client: Client) {
    this.client = client;

    // Methods
    this.registerCallbacks();

    // Events
    onNet(Events.receiveCharacters, this.EVENT_receiveCharacters.bind(this));
    onNet(Events.displayCharacters, this.displayCharacters.bind(this));

    onNet(Events.addMeMessage, this.EVENT_addMeMessage.bind(this));
    onNet(Events.removeMeMessage, this.EVENT_removeMeMessage.bind(this));
    // onNet(Events.syncMeMessages, this.EVENT_syncMeMessages.bind(this));
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CreateCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.createCharacter, {data}, (cbData, passedData) => {
        cb(passedData.character)
      }));
    });

    RegisterNuiCallback(NuiCallbacks.EditCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.editCharacter, {data}, (cbData) => {
        if (cbData.status) {
          cb(cbData.licenses)
        }
      }));
    });

    RegisterNuiCallback(NuiCallbacks.SelectCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.selectCharacter, {characterId: data.characterId}, (cbData) => {
        if (cbData) {
          this.client.player.Spawned = true;
        }
        
        SetNuiFocus(!cbData, !cbData);
        cb(cbData);
      }));
    });
    
    RegisterNuiCallback(NuiCallbacks.DeleteCharacter, async(data, cb) => {
      this.client.serverCallbackManager.Add(new ServerCallback(Callbacks.deleteCharacter, {characterId: data.characterId}, (cbData) => {
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

  private async EVENT_addMeMessage(passedMsg: meDrawing): Promise<void> {
    const newMessage = {
      id: passedMsg.id,
      netId: passedMsg.netId,
      content: passedMsg.content,
      tick: undefined
    }

    this.meMessages.push(newMessage);

    if (this.calculatorTick == undefined) {
      this.calculatorTick = setTick(async() => {
        for (let i = 0; i < this.meMessages.length; i++) {
          const player = GetPlayerFromServerId(Number(this.meMessages[i].netId));
          const ped = new Ped(GetPlayerPed(player));

          if (ped) {
            const dist = ped.Position.distance(Game.PlayerPed.Position);
            if (dist <= clientConfig.characters.meCommand.distance && HasEntityClearLosToEntity(ped.Handle, Game.PlayerPed.Handle, 17)) {
              if (this.meWaiter > 0) {
                this.meWaiter = 0;
                this.mePosition = ped.Position;
              }

              if (this.meMessages[i].tick == undefined) this.meMessages[i].tick = setTick(async() => {
                if (this.meMessages[i] !== undefined) {
                  const position = NumToVector3(GetOffsetFromEntityInWorldCoords(ped.Handle, 0.0, 0.0, 1.2));
                  Draw3DText(position, {r: 170, g: 0, b: 255, a: 255}, this.meMessages[i].content, Font.ChaletLondon, true, 0.1, true);
                }
              });
            }
          }
        }

        if (this.mePosition !== undefined) {
          if (this.mePosition.distance(Game.PlayerPed.Position) > clientConfig.characters.meCommand.distance) {
            if (this.meWaiter < 500) {
              this.meWaiter = 500;
              this.mePosition = undefined;
              
              clearTick(this.calculatorTick);
              this.calculatorTick = undefined;
              
              console.log("Clear 3d me text tick, due to leaving the proximity!");
            }
          }
        }
          
        await Delay(this.meWaiter);
      });
    }
  }

  private EVENT_removeMeMessage(passedMsg: meDrawing): void {
    
    const messageIndex = this.meMessages.findIndex(message => message.id === passedMsg.id && message.netId === passedMsg.netId);
    if (messageIndex !== -1) {
      this.meMessages.splice(messageIndex, 1);

      if (this.meMessages.length <= 0) {
        clearTick(this.calculatorTick);
        this.calculatorTick = undefined;
      }
    }
  }
  
  // private async EVENT_syncMeMessages(messages: any[]): Promise<void> {
  //   this.meMessages = messages;
  //   // console.log("MESSAGES ARE NOW THIS YE FAT JEW FUCK!", JSON.stringify(messages));

  //   if (this.meMessages.length > 0) {
  //     if (this.calculatorTick == undefined) {
  //       this.calculatorTick = setTick(async() => {
        
  //         for (let i = 0; i < this.meMessages.length; i++) {
  //           const player = GetPlayerFromServerId(Number(this.meMessages[i].drawedBy));
  //           const ped = new Ped(GetPlayerPed(player));

  //           console.log("player", this.meMessages[i].drawedBy, player, ped.Handle, Game.Player.Handle, Game.PlayerPed.Handle);

  //           if (ped) {
  //             const dist = ped.Position.distance(Game.PlayerPed.Position);
  //             if (dist <= clientConfig.characters.meCommand.distance && HasEntityClearLosToEntity(ped.Handle, Game.PlayerPed.Handle, 17)) {
  //               if (this.meWaiter > 0) {
  //                 this.meWaiter = 0;
  //                 this.mePosition = ped.Position;
  //               }

  //               if (this.meMessages[i].tick == undefined) this.meMessages[i].tick = setTick(() => {
  //                 if (this.meMessages[i].content) {
  //                   const position = NumToVector3(GetOffsetFromEntityInWorldCoords(ped.Handle, 0.0, 0.0, 1.2));
  //                   Draw3DText(position, {r: 170, g: 0, b: 255, a: 255}, this.meMessages[i].content, Font.ChaletLondon, true, 0.1, true);
  //                 }
  //               });
  //             }
  //           }
  //         }

  //         if (this.meMessages.length <= 0) {
  //           clearTick(this.calculatorTick);
  //           this.calculatorTick = undefined;
            
  //           // console.log("Clear 3d me text tick 1!");
  //         }

  //         if (this.mePosition !== undefined) {
  //           if (this.mePosition.distance(Game.PlayerPed.Position) > clientConfig.characters.meCommand.distance) {
  //             if (this.meWaiter < 500) {
  //               this.meWaiter = 500;
  //               this.mePosition = undefined;
                
  //               clearTick(this.calculatorTick);
  //               this.calculatorTick = undefined;
                
  //               // console.log("Clear 3d me text tick, due to leaving the proximity!");
  //             }
  //           }
  //         }
          
  //         await Delay(this.meWaiter);
  //       });
  //     }
  //   } else {
  //     clearTick(this.calculatorTick);
  //     this.calculatorTick = undefined;
      
  //     // console.log("Clear 3d me text tick 2!");
  //   }
  // }

  // Methods
  public displayCharacters(nuiFocus: boolean): void {
    if (nuiFocus) SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.DisplayCharacters,
      data: {
        characters: this.myCharacters
      }
    }));
  }
}