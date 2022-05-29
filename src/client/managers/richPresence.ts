import { Client } from "../client";

import { insideVeh, speedToMph } from "../utils";

import clientConfig from "../../configs/client.json";
import { getRankFromValue } from "../../shared/utils";
import { Game } from "fivem-js";

interface RichPresenceConfig {
  appId: string;
  largeImage: {
    display: boolean,
    image: string,
    text: string
  },
  smallImage: {
    display: boolean,
    image: string,
    text: string
  },
  buttons: {
    first: {
      label: string,
      action: string
    },
    second: {
      label: string,
      action: string
    }
  },
  intervalTimer: number
}

enum CycleStates {
  PlayerCount,
  AOP,
  SelectedCharacter,
  Status
}

export class RichPresence {
  private client: Client;

  // Rich Presence Data
  private config: RichPresenceConfig;
  public appId: string;
  public statusText: string = undefined;
  public text: string;

  // Cycle Data
  private cycleInterval: NodeJS.Timeout = undefined;
  private cycleState: number;
  
  constructor(client: Client) {
    this.client = client;

    RegisterCommand("update", async(source: number, args: any[]) => {
      if (args[0]) {
        this.statusText = args[0];
      } else {
        this.statusText = null;
      }
    }, false);
  }

  // Getters & Setters
  public get Text(): string {
    return this.text;
  }

  public set Text(newMessage: string) {
    this.text = newMessage;
    this.cycleState
    SetRichPresence(this.text);
  }

  public get Status(): string {
    return this.statusText;
  }

  public set Status(newStatus: string) {
    this.statusText = newStatus;
  }

  // Methods
  public init(): void {
    this.loadSettings();

    // Application ID
    this.appId = this.config.appId;
    SetDiscordAppId(this.appId);
    
    // Main text
    this.text = "Loading Into Server";
    SetRichPresence(this.text);

    if (this.config.largeImage.display) {
      SetDiscordRichPresenceAsset(this.config.largeImage.image);
      SetDiscordRichPresenceAssetText(this.config.largeImage.text);
    }

    if (this.config.smallImage.display) {
      SetDiscordRichPresenceAssetSmall(this.config.smallImage.image);
      SetDiscordRichPresenceAssetSmallText(this.config.smallImage.text);
    }

    SetDiscordRichPresenceAction(0, this.config.buttons.first.label, this.config.buttons.first.action);
    SetDiscordRichPresenceAction(1, this.config.buttons.second.label, this.config.buttons.second.action);
  }

  private loadSettings(): void {
    this.config = clientConfig.richPresence;
    this.appId = this.config.appId;
  }

  public start(): void {
    if (this.cycleInterval === undefined) this.cycleInterval = setInterval(async() => {
      // Large Image Text
      const playerCount: number[] = GetActivePlayers();
      SetDiscordRichPresenceAssetText(`Players Online (${this.client.Players.length}/${this.client.MaxPlayers})`);

      if (this.cycleState !== undefined) {
        if (this.cycleState + 1 > 3) {
          this.cycleState = CycleStates.PlayerCount;
        } else {
          this.cycleState = this.cycleState + 1;
        }
      } else {
        this.cycleState = CycleStates.PlayerCount;
      }
      
      if (this.cycleState == CycleStates.PlayerCount) {
        this.text = `${this.client.Players.length}/${this.client.MaxPlayers} Players Online`;
      } else if (this.cycleState == CycleStates.AOP) {
        this.text = `Current AOP - ${this.client.aopManager.AOP.name}`;
      } else if (this.cycleState == CycleStates.SelectedCharacter) {
        if (this.client.Player.Spawned) {
          if (this.client.Character.isLeoJob()) {
            if (this.client.Character.Job.status) {
              this.text = `Playing as ${this.client.Character.Name} | ${this.client.Character.Job.label} - ${await getRankFromValue(this.client.Character.Job.rank, this.client.Character.Job.name)}`;
            } else {
              this.text = `Playing as ${this.client.Character.Name} | Off Duty (${this.client.Character.Job.label})`;
            }
          } else {
            this.text = `Playing as ${this.client.Character.Name}`;
          }
        } else {
          this.text = "Selecting Character";
        }
      } else if (this.cycleState == CycleStates.Status) {

        // If we have set our status action then display it, if not display info about your current server action
        if (this.statusText !== undefined) {
          this.text = this.statusText; // Display if reloading, unjamming weapon, in jail, handcuffed, etc
        } else {
          const myPed = Game.PlayerPed;
          const myPos = myPed.Position;
          // get location, if on foot, etc
          const [streetHash, crossingHash] = GetStreetNameAtCoord(myPos.x, myPos.y, myPos.z);
          const postal = await this.client.vehicleManager.gps.getNearestPostal(myPed);
          const [currVeh, inVeh] = await insideVeh(myPed);
          
          // Vehicle Information
          if (myPed.IsInWater) {
            if (myPed.IsSwimmingUnderWater) {
              if (crossingHash > 0) {
                this.text = `Under Water At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
              } else {
                this.text = `Under Water At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
              }
            } else {
              if (crossingHash > 0) {
                this.text = `Swimming At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
              } else {
                this.text = `Swimming At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
              }
            }
          } else {
            if (myPed.IsOnFoot) {
              if (IsPedStill(myPed.Handle)) {
                if (crossingHash > 0) {
                  this.text = `Chilling At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Chilling At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              } else if (myPed.IsWalking) {
                if (crossingHash > 0) {
                  this.text = `Walking Down ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Walking Down ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              } else if (myPed.IsSprinting) {
                if (crossingHash > 0) {
                  this.text = `Sprinting Down ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Sprinting Down ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              }
            }
          } 
          
          if (inVeh) {
            const vehSpeed = speedToMph(currVeh.Speed);
            if (currVeh.Model.IsCar || currVeh.Model.IsBike || currVeh.Model.IsQuadbike) {
              console.log("speed", vehSpeed);
              if (vehSpeed > 5 && vehSpeed < 80) {
                if (currVeh.Driver.Handle == myPed.Handle) {
                  if (crossingHash > 0) {
                    this.text = `Driving Down ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                  } else {
                    this.text = `Driving Down ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                  }
                } else {
                  if (crossingHash > 0) {
                    this.text = `Cruising Down ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                  } else {
                    this.text = `Cruising Down ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                  }
                }
              } else if (vehSpeed > 80) {
                if (crossingHash > 0) {
                  this.text = `Speeding Down ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Speeding Down ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              } else {
                if (crossingHash > 0) {
                  this.text = `Parked On ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Parked On ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              }
            } else if (currVeh.Model.IsPlane || currVeh.Model.IsHelicopter) {
              if (currVeh.IsInAir) {
                if (crossingHash > 0) {
                  this.text = `Cruising The Skies At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Cruising The Skies At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              } else {
                if (crossingHash > 0) {
                  this.text = `Parked On ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                } else {
                  this.text = `Parked On ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                }
              }
            } else if (currVeh.Model.IsBoat) {
              if (currVeh.IsEngineRunning) {
                if (vehSpeed > 0) {
                  if (crossingHash > 0) {
                    this.text = `Cruising The Waters At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                  } else {
                    this.text = `Cruising The Waters At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                  }
                } else {
                  if (crossingHash > 0) {
                    this.text = `Chilling The Waters At ${GetStreetNameFromHashKey(streetHash)}, ${GetStreetNameFromHashKey(crossingHash)} at Postal ${postal.code}`;
                  } else {
                    this.text = `Chilling The Waters At ${GetStreetNameFromHashKey(streetHash)}, at Postal ${postal.code}`;
                  }
                }
              } else {
                this.text = `Parked On The Waters`;
              }
            }
          }
        }
      }

      SetRichPresence(this.text);
    }, this.config.intervalTimer);
  }
}
