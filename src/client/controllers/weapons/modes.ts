import { Control, Game, InputMode, Screen } from "fivem-js";

import { GetHash, Delay } from "../../utils";
import { Client } from "../../client";

import { Notification } from "../../models/ui/notification";

import { Weapons } from "../../../shared/enums/weapons";
import { NotificationTypes } from "../../../shared/enums/ui/notifications/types";
import { LXEvents } from "../../../shared/enums/events/lxEvents";

import clientConfig from "../../../configs/client.json";

enum Modes {
  Automatic,
  Burst,
  Single
}

class Weapon {
  public hash: Weapons;
  public state: Modes;
  public safety: boolean;

  constructor(hash: number, state: Modes, safety: boolean) {
    this.hash = hash;
    this.state = state;
    this.safety = safety;
  }
}

export class WeaponModes {
  private client: Client;
  
  // Modes
  private currentWeapon: number;
  private currentState: Modes = Modes.Automatic;

  // Safety
  private safetyActive: boolean = false;
  private safetyTick: number = undefined;

  private weapons: Weapon[] = [];
  // private currentMode: Modes = Modes.Automatic;
  // private safetyToggled: boolean = false;

  // Other
  private fireRateTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    // Keybinds
    RegisterCommand("+next_firing_mode", this.nextFiringMode.bind(this), false);
    RegisterCommand("+prev_firing_mode", this.prevFiringMode.bind(this), false);
    RegisterCommand("+safety_mode", this.toggleSafety.bind(this), false);

    // Events
    onNet(LXEvents.Gunshot_Cl, this.gunshot.bind(this));
  }

  // Methods
  private async weaponExists(): Promise<[boolean, number]> {
    const weaponIndex = this.weapons.findIndex(weapon => weapon.hash == this.currentWeapon);
    return [weaponIndex !== -1, weaponIndex];
  }

  private async getWeaponFromHash(): Promise<Weapon> {
    const weaponIndex = this.weapons.findIndex(weapon => weapon.hash == this.currentWeapon);
    return this.weapons[weaponIndex];
  }

  private async nextFiringMode(): Promise<void> {
    const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);

    if (currWeapon !== Weapons.Unarmed) {
      // Shoots bullets
      if (GetWeaponDamageType(currWeapon) == 3) {
        const index = clientConfig.controllers.weapons.weaponModes.weapons.findIndex(weapon => GetHash(weapon) == currWeapon);
        if (index !== -1) {
          // If current weapon undefined, set it
          if (this.currentWeapon === undefined) {
            this.currentWeapon = currWeapon;
          }

          // Update weapon state
          const oldState = this.currentState;
          if ((this.currentState + 1) > (Object.keys(Modes).length / 2) - 1) {
            this.currentState = 0;
          } else {
            this.currentState++;
          }

          // console.log("update state", oldState, this.currentState, Object.keys(Modes).length / 2);

          // If a weapon entry doesn't exist in the array, create it, if it does update the weapons state in there
          const [weaponEntry, weaponIndex] = await this.weaponExists();
          // console.log("weapon findIndex data", weaponEntry, weaponIndex, this.weapons[weaponIndex]);
          if (weaponEntry) {
            this.weapons[weaponIndex].state = this.currentState;
            // console.log("set to next weapon state in weapons array!");
          } else {
            // console.log("weapon not found, insert it!");
            this.weapons.push(new Weapon(this.currentWeapon, this.currentState, this.safetyActive));
          }

          // if (this.currentState == Modes.Automatic) {
          //   console.log("automatic firing mode init!");
          // } else if (this.currentState == Modes.Burst) {
          //   console.log("initiate burst tick, maybe make a method and have the tick run it");
          // } else if (this.currentState == Modes.Single) {
          //   console.log("initiate single tick, maybe make a method and have the tick run it");
          // }

          const notify = new Notification("Firing Modes", `Firing mode switched to ${Modes[this.currentState]}`, NotificationTypes.Info);
          await notify.send();
          PlaySoundFrontend(-1, "Place_Prop_Success", "DLC_Dmod_Prop_Editor_Sounds", false);
        } else {
          console.log("this weapon doesn't support multiple firing modes!");
        }
      } else {
        console.log("your current weapon, doesn't support firing modes. As it doesn't shoot bullets!");
      }
    } else {
      console.log("can't cycle firing mode as you're unarmed!");
    }
  }
  
  private async prevFiringMode(): Promise<void> {
    const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);

    if (currWeapon !== Weapons.Unarmed) {
      // Shoots bullets
      if (GetWeaponDamageType(currWeapon) == 3) {
        const index = clientConfig.controllers.weapons.weaponModes.weapons.findIndex(weapon => GetHash(weapon) == currWeapon);
        if (index !== -1) {
          // If current weapon undefined, set it
          if (this.currentWeapon === undefined) {
            this.currentWeapon = currWeapon;
          }

          // Update weapon state
          const oldState = this.currentState;
          if ((this.currentState - 1) < 0) {
            this.currentState = (Object.keys(Modes).length / 2) - 1;
          } else {
            this.currentState--;
          }

          // console.log("update state", oldState, this.currentState, Object.keys(Modes).length / 2);

          // If a weapon entry doesn't exist in the array, create it, if it does update the weapons state in there
          const [weaponEntry, weaponIndex] = await this.weaponExists();
          // console.log("weapon findIndex data", weaponEntry, weaponIndex, this.weapons[weaponIndex]);
          if (weaponEntry) {
            this.weapons[weaponIndex].state = this.currentState;
            // console.log("set to next weapon state in weapons array!");
          } else {
            // console.log("weapon not found, insert it!");
            this.weapons.push(new Weapon(this.currentWeapon, this.currentState, this.safetyActive));
          }

          // if (this.currentState == Modes.Automatic) {
          //   console.log("automatic firing mode init!");
          // } else if (this.currentState == Modes.Burst) {
          //   console.log("initiate burst tick, maybe make a method and have the tick run it");
          // } else if (this.currentState == Modes.Single) {
          //   console.log("initiate single tick, maybe make a method and have the tick run it");
          // }

          const notify = new Notification("Firing Modes", `Firing mode switched to ${Modes[this.currentState]}`, NotificationTypes.Info);
          await notify.send();
          PlaySoundFrontend(-1, "Place_Prop_Success", "DLC_Dmod_Prop_Editor_Sounds", false);
        } else {
          console.log("this weapon doesn't support multiple firing modes!");
        }
      } else {
        console.log("your current weapon, doesn't support firing modes. As it doesn't shoot bullets!");
      }
    } else {
      console.log("can't cycle firing mode as you're unarmed!");
    }
  }

  private async toggleSafety(): Promise<void> {
    const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);

    if (currWeapon !== Weapons.Unarmed) {
      // Shoots bullets
      if (GetWeaponDamageType(currWeapon) == 3) {
        this.safetyActive = !this.safetyActive;
        const [weaponEntry, weaponIndex] = await this.weaponExists();
        // console.log("weapon findIndex data", weaponEntry, weaponIndex, this.weapons[weaponIndex]);
        if (weaponEntry) {
          this.weapons[weaponIndex].safety = this.safetyActive;
          // console.log("set safety to", this.safetyActive);
        } else {
          // console.log("weapon not found, insert it!");
          this.weapons.push(new Weapon(this.currentWeapon, this.currentState, this.safetyActive));
        }

        if (this.safetyActive) {
          const notify = new Notification("Weapon", `Safety toggled!`, NotificationTypes.Info);
          await notify.send();
        } else {
          const notify = new Notification("Weapon", `Safety disabled!`, NotificationTypes.Info);
          await notify.send();
        }

        if (this.safetyActive) {
          // console.log("safety on")
          if (this.safetyTick === undefined) this.safetyTick = setTick(() => {
            // console.log("running safety tick!");
            const currWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle);
        
            if (currWeapon !== Weapons.Unarmed) {
              // Shoots bullets
              if (GetWeaponDamageType(currWeapon) == 3) {
                // console.log("disable thing!");
                DisablePlayerFiring(Game.Player.Handle, true);

                if (Game.isControlJustPressed(0, Control.Attack) || Game.isDisabledControlJustPressed(0, Control.Attack)) {
                  PlaySoundFrontend(-1, "Place_Prop_Fail", "DLC_Dmod_Prop_Editor_Sounds", false);
                  Screen.showSubtitle("~y~Safety Active", 2000);
                }
              }
            }
          });
        } else {
          clearTick(this.safetyTick);
          this.safetyTick = undefined;
        }
      }
    }
  }

  // Events
  private async gunshot(): Promise<void> {
    this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

    let currWeapData = await this.getWeaponFromHash();
    // console.log("curr weap data", currWeapData);

    // If we have already inserted our weapon data into the array, update our state variable (once our firing mode is changed, the below will run)
    if (currWeapData !== undefined) {
      this.currentState = currWeapData.state;
    }

    // if we aren't unarmed
    if (this.currentWeapon != Weapons.Unarmed) {
      // If our gun shoots bullets
      if (GetWeaponDamageType(this.currentWeapon) == 3) {
        const configIndex = clientConfig.controllers.weapons.weaponModes.weapons.findIndex(weapon => GetHash(weapon) == this.currentWeapon);

        // console.log("do it!");
        // If weapon has multiple firing modes
        if (configIndex !== -1) {
          // insert weapon into array if not found!
          let [weaponEntry, weaponIndex] = await this.weaponExists();

          if (weaponEntry) {
            // console.log("set values to array data", this.weapons[weaponIndex])
            // Update values back to weapon settings
            this.currentState = this.weapons[weaponIndex].state;
            this.safetyActive = this.weapons[weaponIndex].safety;
          } else {
            // console.log("insert weapon data", this.currentWeapon, Modes.Automatic, false);
            // Update values back to default and then insert new class
            this.currentState = Modes.Automatic;
            this.safetyActive = false;

            this.weapons.push(new Weapon(this.currentWeapon, this.currentState, this.safetyActive));
            weaponIndex = this.weapons.length - 1;
            currWeapData = this.weapons[weaponIndex];
          }

          // console.log("my local data", this.currentWeapon, this.currentState, this.safetyActive, this.weapons);
            
          // console.log("curr weapon data", currWeapData);

          if (currWeapData.state == Modes.Burst) {
            // console.log("this weapon is burst when firing!");
            await Delay(350);

            while (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Attack) || Game.isDisabledControlPressed(InputMode.MouseAndKeyboard, Control.Attack)) {
              DisablePlayerFiring(Game.Player.Handle, true);
              await Delay(0);
            }
          } else if (currWeapData.state == Modes.Single) {
            while (Game.isControlPressed(InputMode.MouseAndKeyboard, Control.Attack) || Game.isDisabledControlPressed(InputMode.MouseAndKeyboard, Control.Attack)) {
              await Delay(10);
              DisablePlayerFiring(Game.Player.Handle, true);
              // console.log("still holding fire button!");
            }

            // console.log("released trigger")
          }
        }
      }
    }
  }
}