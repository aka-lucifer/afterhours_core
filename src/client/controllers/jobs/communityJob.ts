import {Game, Model} from 'fivem-js';

import {Client} from '../../client';
import {Inform} from '../../utils';

import {Menu} from '../../models/ui/menu/menu';
import {Submenu} from "../../models/ui/menu/submenu";

import {MenuPositions} from '../../../shared/enums/ui/menu/positions';
import {JobEvents} from '../../../shared/enums/events/jobs/jobEvents';
import {Jobs} from '../../../shared/enums/jobs/jobs';
import {Events} from '../../../shared/enums/events/events';
import {JobCallbacks} from '../../../shared/enums/events/jobs/jobCallbacks';

import sharedConfig from "../../../configs/shared.json";
import {Weapons} from "../../../shared/enums/weapons";
import {Notification} from "../../models/ui/notification";
import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";

export class CommunityJob {
  private client: Client;

  // Menus
  private menuBuilt: boolean = false;
  private menu: Menu;
  private weapons: Submenu;

  // Menu Data
  private rifle: string;
  private shotgun: string;
  private pistol: string;
  private tazer: string;
  private nightstick: string;

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
    // Make the community officer menu here
    this.menu = new Menu("Community Officer", GetCurrentResourceName(), MenuPositions.MiddleLeft);
  }

  public createMenu(): void {
    if (this.client.Character.job.name === Jobs.Community) {
      this.menu.BindCheckbox("On Duty", this.client.Character.job.status, (newState: boolean) => {
        this.client.cbManager.TriggerServerCallback(JobCallbacks.setDuty, async(returnedState: boolean) => {
          this.client.Character.job.status = returnedState;

          if (returnedState) {
            const currModel = this.client.modelBlacklist.Model;

            // If your current ped model isn't the `cofficer` ped model
            if (currModel.Hash !== GetHashKey("cofficer")) {
              const newModel = new Model("cofficer");
              const modelLoaded = await newModel.request(2000); // Load the ped into memory, if it isn't loaded yet
              if (modelLoaded) { // Once it has been loaded, apply the model to your player and then remove the model from memory
                SetPlayerModel(Game.Player.Handle, newModel.Hash); // Apply the model to your player
                this.client.modelBlacklist.Model = newModel; // Set this model to your new model in the model blacklist controller
                newModel.markAsNoLongerNeeded(); // Remove the model from memory

                // Sets styling of ped
                SetPedComponentVariation(Game.PlayerPed.Handle, 0, 1, 1, 0);
                SetPedComponentVariation(Game.PlayerPed.Handle, 1, 0, 0, 0);
                SetPedComponentVariation(Game.PlayerPed.Handle, 2, 0, 0, 0);
                SetPedComponentVariation(Game.PlayerPed.Handle, 3, 1, 0, 0);
                SetPedComponentVariation(Game.PlayerPed.Handle, 4, 0, 0, 0);
                SetPedComponentVariation(Game.PlayerPed.Handle, 8, 2, 0, 0);

                // Set weapon menu checkboxes, as setting a new model on your ped removes your weapons
                this.client.menuManager.UpdateState(this.rifle, false);
                this.client.menuManager.UpdateState(this.shotgun, false);
                this.client.menuManager.UpdateState(this.pistol, false);
                this.client.menuManager.UpdateState(this.tazer, false);
                this.client.menuManager.UpdateState(this.nightstick, false);
              }
            }

            global.exports["pma-voice"].setVoiceProperty("radioEnabled", true);
            global.exports["pma-voice"].setRadioChannel(245.1, "LEO (Main RTO)");
          } else {
            global.exports["pma-voice"].setVoiceProperty("radioEnabled", false);
            global.exports["pma-voice"].setRadioChannel(0);
          }
        }, newState);
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

      // WEAPONS
      this.weapons = this.menu.BindSubmenu("Weapons");

      this.rifle = this.weapons.BindCheckbox(sharedConfig.weapons[Weapons.AR15].label, HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.AR15, false), (newState: boolean) => {
        this.client.menuManager.UpdateState(this.rifle, newState);
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.AR15, false)) {
          const [_, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, Weapons.AR15);
          Game.PlayerPed.giveWeapon(Weapons.AR15, maxAmmo, false, true);
        } else {
          RemoveWeaponFromPed(Game.PlayerPed.Handle, Weapons.AR15);
        }
      });

      this.shotgun = this.weapons.BindCheckbox(sharedConfig.weapons[Weapons.Remington870].label, HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Remington870, false), (newState: boolean) => {
        this.client.menuManager.UpdateState(this.shotgun, newState);
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Remington870, false)) {
          const [_, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, Weapons.Remington870);
          Game.PlayerPed.giveWeapon(Weapons.Remington870, maxAmmo, false, true);
        } else {
          RemoveWeaponFromPed(Game.PlayerPed.Handle, Weapons.Remington870);
        }
      });

      this.pistol = this.weapons.BindCheckbox(sharedConfig.weapons[Weapons.Glock17].label, HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Glock17, false), (newState: boolean) => {
        this.client.menuManager.UpdateState(this.pistol, newState);
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Glock17, false)) {
          const [_, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, Weapons.Glock17);
          Game.PlayerPed.giveWeapon(Weapons.Glock17, maxAmmo, false, true);
        } else {
          RemoveWeaponFromPed(Game.PlayerPed.Handle, Weapons.Glock17);
        }
      });

      this.tazer = this.weapons.BindCheckbox(sharedConfig.weapons[Weapons.X26Tazer].label, HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.X26Tazer, false), (newState: boolean) => {
        this.client.menuManager.UpdateState(this.tazer, newState);
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.X26Tazer, false)) {
          const [_, maxAmmo] = GetMaxAmmo(Game.PlayerPed.Handle, Weapons.X26Tazer);
          Game.PlayerPed.giveWeapon(Weapons.X26Tazer, maxAmmo, false, true);
        } else {
          RemoveWeaponFromPed(Game.PlayerPed.Handle, Weapons.X26Tazer);
        }
      });

      this.nightstick = this.weapons.BindCheckbox(sharedConfig.weapons[Weapons.Nightstick].label, HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Nightstick, false), (newState: boolean) => {
        this.client.menuManager.UpdateState(this.nightstick, newState);
        if (!HasPedGotWeapon(Game.PlayerPed.Handle, Weapons.Nightstick, false)) {
          Game.PlayerPed.giveWeapon(Weapons.Nightstick, 0, false, true);
        } else {
          RemoveWeaponFromPed(Game.PlayerPed.Handle, Weapons.Nightstick);
        }
      });

      this.menu.BindButton("Join RTO", async() => {
        if (this.client.Character.Job.status) { // If on duty
          global.exports["pma-voice"].setVoiceProperty("radioEnabled", true);
          global.exports["pma-voice"].setRadioChannel(245.1, "LEO (Main RTO)");
        } else {
          const notify = new Notification("Radio", "You aren't on duty!", NotificationTypes.Error);
          await notify.send();
        }
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
