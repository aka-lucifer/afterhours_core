import { Client } from "../client";
import { svPlayer } from "../models/player"
import { Delay } from "../utils";

export class RichPresence {
  private client: Client;
  public player: svPlayer;
  public appId: string;
  public statusText: string;
  public text: string;
  public presenceTick: number;
  
  constructor(client: Client) {
    this.client = client;
    this.appId = this.client.Discord.appId;
    this.statusText = "None";
    SetDiscordAppId(this.appId);

    SetRichPresence("Eating Pussy")

    RegisterCommand("update", async(source: number, args: any[]) => {
      if (args[0]) {
        this.statusText = args[0];
        SetRichPresence(this.statusText);
      } else {
        this.statusText = null;
      }
    }, false);
  }

  // Get Requests
  public get Text(): string {
    return this.text;
  }

  // Set Requests
  public set Text(newMessage: string) {
    this.text = newMessage;
    SetRichPresence(this.text);
  }

  public set Status(newStatus: string) {
    this.statusText = newStatus;
    SetRichPresence(this.statusText);
  }

  // Methods
  public Setup(player: svPlayer): void {
    this.player = player;
    this.presenceTick = setTick(async() => {
      await Delay(2500);
      this.text = `Nibbling Eggs`;

      if (this.client.Discord.largeImage.display) {
        SetDiscordRichPresenceAsset(this.client.Discord.largeImage.image);
        SetDiscordRichPresenceAssetText(this.client.Discord.largeImage.text);
      }

      if (this.client.Discord.smallImage.display) {
        SetDiscordRichPresenceAsset(this.client.Discord.smallImage.image);
        SetDiscordRichPresenceAssetText(this.client.Discord.smallImage.text);
      }

      SetRichPresence(this.statusText != "None" ? this.statusText : this.text);
    })
  }
}