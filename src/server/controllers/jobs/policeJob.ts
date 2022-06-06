import { Server } from '../../server';
import { Capitalize } from '../../utils';

import { Command, JobCommand } from '../../models/ui/chat/command';

import * as Database from '../../managers/database/database';

import { Cuffing } from './police/cuffing';
import { Grabbing } from './police/grabbing';

import { Jobs } from '../../../shared/enums/jobs/jobs';
import { Events } from '../../../shared/enums/events/events';
import { Message } from '../../../shared/models/ui/chat/message';
import { SystemTypes } from '../../../shared/enums/ui/chat/types';
import { Ranks } from '../../../shared/enums/ranks';
import { concatArgs, formatFirstName } from '../../../shared/utils';
import { JobEvents } from '../../../shared/enums/events/jobs/jobEvents';

enum Calls {
  Normal,
  Emergency
}

interface CallData {
  id: number;
  caller: string;
  type: Calls;
  street: string;
  crossing?: string;
  postal: string;
  zone: string;
  description: string;
}

export class PoliceJob {
  private server: Server;

  // 911/311 Calls
  private activeCalls: CallData[] = [];

  // Controllers
  private cuffing: Cuffing;
  private grabbing: Grabbing;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(JobEvents.send911Call, this.EVENT_send911Call.bind(this));
    onNet(JobEvents.send311Call, this.EVENT_send311Call.bind(this));

    // Controllers
    this.cuffing = new Cuffing(this.server);
    this.grabbing = new Grabbing(this.server);
  }

  // Methods
  private registerCommands(): void {
    new JobCommand("runname", "Run a suspects name in the CAD/MDT", [{name: "firstName", help: "Persons first name"}, {name: "lastName", help: "Persons last name"}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (args[0]) {
        if (args[1]) {
          if (player) {
            if (player.Spawned) {
              const character = await this.server.characterManager.Get(player);
              
              if (character) {

                // If on duty
                if (character.Job.status) {
                  const foundCharacter = await Database.SendQuery("SELECT `id` FROM `player_characters` WHERE `first_name` = :firstName AND `last_name` = :lastName LIMIT 1", {
                    firstName: args[0],
                    lastName: args[1]
                  });

                  if (foundCharacter.data.length > 0) {
                    const foundChar = await this.server.characterManager.getFromId(foundCharacter.data[0].id);

                    if (foundChar) {
                      const charLicenses = foundChar.Metadata.licensesToLabel();
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`^0Name: ^3${foundChar.Name} ^0| DOB: ^3${foundChar.DOB} ^0| Nationality: ^3${foundChar.Nationality} ^0| Gender: ^3${foundChar.Gender} ^0| Drivers License: ^3${Capitalize(charLicenses.includes("driver").toString())} ^0| Weapons License: ^3${Capitalize(charLicenses.includes("weapon").toString())}^0.`, SystemTypes.Dispatch));

                      
                      const vehicles = await this.server.charVehicleManager.GetCharVehicles(foundChar);
                      if (vehicles.length > 0) {
                        let vehString = "";

                        if (vehicles.length > 1) {
                          for (let i = 0; i < vehicles.length; i++) {
                            console.log("vehs", i, vehicles.length - 1)
                            if (i == vehicles.length - 1) {
                              if (vehString.length > 0) {
                                vehString = `${vehString}<br><br>^0Model: ^3${vehicles[i].Label} ^0| Type: ^3${vehicles[i].Type} ^0| Colour: ^3${vehicles[i].Colour} ^0| Plate: ^3${vehicles[i].Plate} ^0| Registered On: ^3${new Date(vehicles[i].Registered).toUTCString()}^0.`
                              } else {
                                vehString = `^0Model: ^3${vehicles[i].Label} ^0| Type: ^3${vehicles[i].Type} ^0| Colour: ^3${vehicles[i].Colour} ^0| Plate: ^3${vehicles[i].Plate} ^0| Registered On: ^3${new Date(vehicles[i].Registered).toUTCString()}^0.`
                              }
                            } else {
                              if (vehString.length > 0) {
                                vehString = `${vehString}<br><br>^0Model: ^3${vehicles[i].Label} ^0| Type: ^3${vehicles[i].Type} ^0| Colour: ^3${vehicles[i].Colour} ^0| Plate: ^3${vehicles[i].Plate} ^0| Registered On: ^3${new Date(vehicles[i].Registered).toUTCString()}`;
                              } else {
                                vehString = `^0Model: ^3${vehicles[i].Label} ^0| Type: ^3${vehicles[i].Type} ^0| Colour: ^3${vehicles[i].Colour} ^0| Plate: ^3${vehicles[i].Plate} ^0| Registered On: ^3${new Date(vehicles[i].Registered).toUTCString()}^0.`;
                              }
                            }
                          }
                        } else {
                          vehString = `^0Model: ^3${vehicles[0].Label} ^0| Type: ^3${vehicles[0].Type} ^0| Colour: ^3${vehicles[0].Colour} ^0| Plate: ^3${vehicles[0].Plate} ^0| Registered On: ^3${new Date(vehicles[0].Registered).toUTCString()}^0.`;
                        }

                        await player.TriggerEvent(Events.sendSystemMessage, new Message(`Owned Vehicles ^0| ${vehString}`, SystemTypes.Dispatch));
                      }
                    } else {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message("No character online with that name!", SystemTypes.Error));
                    }
                  } else {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message("No results found in CAD MDT!", SystemTypes.Error));
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("You aren't on duty!", SystemTypes.Error));
                }
              }
            }
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("No last name entered!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No first name entered!", SystemTypes.Error));
      }
    }, [Jobs.State, Jobs.Police, Jobs.County]);
    
    new JobCommand("runplate", "Run a vehicles plate in the CAD/MDT", [{name: "plate", help: "Vehicle plate"}, {name: "firstName", help: "Persons first name"}, {name: "lastName", help: "Persons last name"}], true, async(source: string, args: any[]) => {
      const player = await this.server.connectedPlayerManager.GetPlayer(source);

      if (args[0]) {
        if (args[1]) {
          if (args[2]) {
            if (player) {
              if (player.Spawned) {
                const character = await this.server.characterManager.Get(player);
                
                if (character) {

                  // If on duty
                  if (character.Job.status) {
                    const foundVeh = await this.server.charVehicleManager.getVehFromPlate(player, args[0], args[1], args[2]);
                    if (foundVeh !== undefined) {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`^0Model: ^3${foundVeh.Label} ^0| Type: ^3${foundVeh.Type} ^0| Colour: ^3${foundVeh.Colour} ^0| Plate: ^3${foundVeh.Plate} ^0| Registered On: ^3${new Date(foundVeh.Registered).toUTCString()}^0.`, SystemTypes.Dispatch));
                    } else {
                      await player.TriggerEvent(Events.sendSystemMessage, new Message("No vehicle found in CAD MDT!", SystemTypes.Error));
                    }
                  } else {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message("You aren't on duty!", SystemTypes.Error));
                  }
                }
              }
            }
          } else {
            await player.TriggerEvent(Events.sendSystemMessage, new Message("No last name entered!", SystemTypes.Error));
          }
        } else {
          await player.TriggerEvent(Events.sendSystemMessage, new Message("No first name entered!", SystemTypes.Error));
        }
      } else {
        await player.TriggerEvent(Events.sendSystemMessage, new Message("No vehicle plate entered!", SystemTypes.Error));
      }
    }, [Jobs.State, Jobs.Police, Jobs.County]);

    new JobCommand("dispatch", "Reply to a emergency call", [{name: "callId", help: "The ID of the call, you're responding to."}, {name: "response", help: "The response to the callmaker."}], true, async(source: string, args: any[]) => {
      if (args[0] && args[1]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source);
        if (player) {
          if (player.Spawned) {
            const character = await this.server.characterManager.Get(player);
            
            if (character) {
              if (character.isLeoJob() || character.isSAFREMSJob()) {
                if (character.Job.Status) {
                  const callId = parseInt(args[0]);
                  const callIndex = this.activeCalls.findIndex(call => call.id == callId);

                  if (callIndex !== -1) {
                    if (this.activeCalls[callIndex].type == Calls.Emergency) {
                      const responderName = `${formatFirstName(character.firstName)}. ${character.lastName}`;
                      const message = concatArgs(1, args);
                      emitNet(Events.sendSystemMessage, this.activeCalls[callIndex].caller, new Message(`911 (#${callId}) Response ^0| Unit: ^3[${character.Job.Callsign}] - ${responderName} ^0| Message: ^3${message}`, SystemTypes.Dispatch));
                      emitNet(Events.soundFrontEnd, this.activeCalls[callIndex].caller, "Menu_Accept", "Phone_SoundSet_Default");

                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`Dispatch Response "${message}" Sent!`, SystemTypes.Success));
                    } else if (this.activeCalls[callIndex].type == Calls.Normal) {
                      const responderName = `${formatFirstName(character.firstName)}. ${character.lastName}`;
                      const message = concatArgs(1, args);
                      emitNet(Events.sendSystemMessage, this.activeCalls[callIndex].caller, new Message(`311 (#${callId}) Response ^0| Unit: ^3[${character.Job.Callsign}] - ${responderName} ^0| Message: ^3${message}`, SystemTypes.Dispatch));
                      emitNet(Events.soundFrontEnd, this.activeCalls[callIndex].caller, "Menu_Accept", "Phone_SoundSet_Default");

                      await player.TriggerEvent(Events.sendSystemMessage, new Message(`Dispatch Response "${message}" Sent!`, SystemTypes.Success));
                    }
                  } else {
                    await player.TriggerEvent(Events.sendSystemMessage, new Message(`No call found with ID - ${callId}!`, SystemTypes.Error));
                  }
                } else {
                  await player.TriggerEvent(Events.sendSystemMessage, new Message("You aren't on duty!", SystemTypes.Error));
                }
              }
            }
          }
        }
      }
    }, [Jobs.State, Jobs.Police, Jobs.County]);

    new Command("911", "Call 911 with an emergency", [{name: "description", help: "The description of your 911 call."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source);
        if (player) {
          if (player.Spawned) {
            const character = await this.server.characterManager.Get(player);
            
            if (character) {
              const callDescription = concatArgs(0, args);
              await player.TriggerEvent(JobEvents.start911Call, callDescription);
            }
          }
        }
      }
    }, Ranks.User);

    new Command("311", "Call 311 with an emergency", [{name: "description", help: "The description of your 311 call."}], true, async(source: string, args: any[]) => {
      if (args[0]) {
        const player = await this.server.connectedPlayerManager.GetPlayer(source);
        if (player) {
          if (player.Spawned) {
            const character = await this.server.characterManager.Get(player);
            
            if (character) {
              const callDescription = concatArgs(0, args);
              await player.TriggerEvent(JobEvents.start311Call, callDescription);
            }
          }
        }
      }
    }, Ranks.User);
  }

  public init(): void {
    this.registerCommands();
  }

  // Events
  private async EVENT_send911Call(street: string, crossing: string, postal: string, zone: string, description: string): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (myPlayer && myPlayer.Spawned) {
      const myCharacter = await this.server.characterManager.Get(myPlayer);

      if (myCharacter) {
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;
        const callId = this.activeCalls.length + 1;
        this.activeCalls.push({
          id: callId,
          caller: myPlayer.Handle,
          type: Calls.Emergency,
          street: street,
          crossing: crossing,
          postal: postal,
          zone: zone,
          description: description
        });

        for (let i = 0; i < svPlayers.length; i++) {
          const character = await this.server.characterManager.Get(svPlayers[i]);

          if (character.isLeoJob() || character.isSAFREMSJob()) {
            if (character.Job.Status) {
              if (crossing.length > 0) {
                await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`911 Call ^0| ID: ^3#${callId} ^0| Name: ^3${myCharacter.Name} ^0| Location: ^3${street}^0 / ^3${crossing}^0, ^0[^3${zone}^0] (^3Postal ^0- ^3${postal}^0) | Description: ^3${description}`, SystemTypes.Dispatch));
              } else {
                await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`911 Call ^0| ID: ^3#${callId} ^0| Name: ^3${myCharacter.Name} ^0| Location: ^3${street}^0, ^0[^3${zone}^0] (^3Postal ^0- ^3${postal}^0) | Description: ^3${description}`, SystemTypes.Dispatch));
              }

              await svPlayers[i].TriggerEvent(JobEvents.receive911Call, callId,  myPlayer.Position, myCharacter.Name);
            }
          }
        }

        setTimeout(async() => {
          for (let i = 0; i < svPlayers.length; i++) {
            const character = await this.server.characterManager.Get(svPlayers[i]);

            if (character.isLeoJob() || character.isSAFREMSJob()) {
              if (character.Job.Status) {
                await svPlayers[i].TriggerEvent(JobEvents.deleteCall, callId,  myPlayer.Position, myCharacter.Name);
                const callIndex = this.activeCalls.findIndex(call => call.id == callId);
                if (callIndex !== -1) {
                  this.activeCalls.splice(callIndex, 1);
                }
              }
            }
          }
        }, 300000); // Delete blip after 5 minutes.

        await myPlayer.TriggerEvent(Events.sendSystemMessage, new Message("911 Call Sent!", SystemTypes.Success));
      }
    }
  }

  private async EVENT_send311Call(street: string, crossing: string, postal: string, zone: string, description: string): Promise<void> {
    const myPlayer = await this.server.connectedPlayerManager.GetPlayer(source);
    if (myPlayer && myPlayer.Spawned) {
      const myCharacter = await this.server.characterManager.Get(myPlayer);

      if (myCharacter) {
        const svPlayers = this.server.connectedPlayerManager.GetPlayers;
        const callId = this.activeCalls.length + 1;
        this.activeCalls.push({
          id: callId,
          caller: myPlayer.Handle,
          type: Calls.Normal,
          street: street,
          crossing: crossing,
          postal: postal,
          zone: zone,
          description: description
        });
        
        for (let i = 0; i < svPlayers.length; i++) {
          const character = await this.server.characterManager.Get(svPlayers[i]);

          if (character.isLeoJob() || character.isSAFREMSJob()) {
            if (character.Job.Status) {
              if (crossing.length > 0) {
                await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`311 Call ^0| ID: ^3#${svPlayers[i].Handle} ^0| Name: ^3${myCharacter.Name} ^0| Location: ^3${street}^0 / ^3${crossing}^0, ^0[^3${zone}^0] (^3Postal ^0- ^3${postal}^0) | Description: ^3${description}`, SystemTypes.Dispatch));
              } else {
                await svPlayers[i].TriggerEvent(Events.sendSystemMessage, new Message(`311 Call ^0| ID: ^3#${svPlayers[i].Handle} ^0| Name: ^3${myCharacter.Name} ^0| Location: ^3${street}^0, ^0[^3${zone}^0] (^3Postal ^0- ^3${postal}^0) | Description: ^3${description}`, SystemTypes.Dispatch));
              }

              await svPlayers[i].TriggerEvent(JobEvents.receive311Call, callId,  myPlayer.Position, myCharacter.Name);
            }
          }
        }

        setTimeout(async() => {
          for (let i = 0; i < svPlayers.length; i++) {
            const character = await this.server.characterManager.Get(svPlayers[i]);

            if (character.isLeoJob() || character.isSAFREMSJob()) {
              if (character.Job.Status) {
                await svPlayers[i].TriggerEvent(JobEvents.deleteCall, callId,  myPlayer.Position, myCharacter.Name);
              }
            }
          }
        }, 300000); // Delete blip after 5 minutes.

        await myPlayer.TriggerEvent(Events.sendSystemMessage, new Message("311 Call Sent!", SystemTypes.Success));
      }
    }
  }
}
