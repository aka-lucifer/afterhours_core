import { Client } from "../client";

import { svPlayer } from "../models/player"

import { Delay } from "../utils";

import clientConfig from "../../configs/client.json";
import { getRankFromValue } from "../../shared/utils";

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
  public statusText: string = "Eating Patrick's, Star... ;)";
  public text: string;

  // Cycle Data
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
    setInterval(async() => {
      // Large Image Text
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
        this.text = this.statusText;
      }

      SetRichPresence(this.text);
    }, this.config.intervalTimer);
  }
}