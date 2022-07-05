import { Game, Model } from 'fivem-js';

import { Client } from '../../client';
import { Inform } from '../../utils';

import { Menu } from '../../models/ui/menu/menu';
import { MenuPositions } from '../../../shared/enums/ui/menu/positions';
import { JobEvents } from '../../../shared/enums/events/jobs/jobEvents';
import { Jobs } from '../../../shared/enums/jobs/jobs';
import { Events } from '../../../shared/enums/events/events';
import { ServerCallback } from '../../models/serverCallback';
import { JobCallbacks } from '../../../shared/enums/events/jobs/jobCallbacks';

export class CommunityJob {
  private client: Client;

  // Menus
  private menuBuilt: boolean = false;
  private menu: Menu;

  // Menu Data

  constructor(client: Client) {
    this.client = client;

    // Keymappings
    RegisterKeyMapping("+toggle_community_menu", "Open community menu ting", "keyboard", "F11");
    RegisterCommand("+toggle_community_menu", async() => {
      if (this.menu !== undefined) {
        if (this.menuBuilt) {
          await this.menu.Open();
        }
      }
    }, false);

    Inform("Community Officer | Jobs Controller", "Started!");
  }

  // Getters
  public get MenuBuilt(): boolean {
    return this.menuBuilt;
  }

  // Methods
  public init(): void {
    console.log("create menu in here!");

    // Make the community officer menu here
    this.menu = new Menu("Community Officer", GetCurrentResourceName(), MenuPositions.MiddleLeft);
  }

  public createMenu(): void {
    if (this.client.Character.job.name === Jobs.Community) {
      console.log("create community officer menu options here!");
      this.menu.BindCheckbox("On Duty", this.client.Character.job.status, (newState: boolean) => {
        this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.setDuty, {state: newState}, async(cbData, passedData) => {
          if (cbData) {
            this.client.Character.job.status = newState;

            if (newState) {
              const currModel = this.client.modelBlacklist.Model;

              // If your current ped model isn't the `cofficer` ped model
              if (currModel.Hash !== GetHashKey("cofficer")) {
                const newModel = new Model("cofficer");
                const modelLoaded = await newModel.request(2000); // Load the ped into memory, if it isn't loaded yet
                if (modelLoaded) { // Once it has been loaded, apply the model to your player and then remove the model from memory
                  SetPlayerModel(Game.Player.Handle, newModel.Hash); // Apply the model to your player
                  this.client.modelBlacklist.Model = newModel; // Set this model to your new model in the model blacklist controller
                  newModel.markAsNoLongerNeeded(); // Remove the model from memory
                }
              }

              global.exports["pma-voice"].setVoiceProperty("radioEnabled", true);
              global.exports["pma-voice"].setRadioChannel(245.1, "LEO (Main RTO)");
            } else {
              global.exports["pma-voice"].setVoiceProperty("radioEnabled", false);
              global.exports["pma-voice"].setRadioChannel(0);
            }
          }
        }));
      })

      this.menu.BindButton("Cuff Player", () => {
        emitNet(JobEvents.cuffPlayer);
      });

      this.menu.BindButton("Uncuff Player", () => {
        emitNet(JobEvents.uncuffPlayer);
      });

      this.menu.BindButton("Grab Player", () => {
        emitNet(JobEvents.tryGrabbing);
      });

      this.menu.BindButton("Seat Player", () => {
        emitNet(Events.trySeating);
      });

      this.menu.BindButton("Unseat Player", () => {
        emitNet(Events.unseatPlayer);
      });

      if (!this.menuBuilt) this.menuBuilt = true;
    } else {
      console.log("Can't make community officer menu options, as you aren't a community officer!");
    }
  }

  public destroyMenu(): void {
    if (this.menuBuilt) {
      this.menuBuilt = false;
      this.client.menuManager.emptyMenu(this.menu.handle);
    }
  }
}
