
import { Server } from "../../server";
import { Capitalize } from "../../utils";

import { JobCommand } from "../../models/ui/chat/command";

import * as Database from "../../managers/database/database";

import { Jobs } from "../../../shared/enums/jobs/jobs";
import { Events } from "../../../shared/enums/events/events";
import { Message } from "../../../shared/models/ui/chat/message";
import { SystemTypes } from "../../../shared/enums/ui/chat/types";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";

export class PoliceJob {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
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
  }

  public init(): void {
    this.registerCommands();
  }
}