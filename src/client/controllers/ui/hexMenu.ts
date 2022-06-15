import { Audio, Bone, Game } from 'fivem-js';

import { Inform, RegisterNuiCallback } from '../../utils';

import { NuiCallbacks } from '../../../shared/enums/ui/nuiCallbacks';
import { NuiMessages } from '../../../shared/enums/ui/nuiMessages';
import { JobEvents } from '../../../shared/enums/events/jobs/jobEvents';
import { Events } from '../../../shared/enums/events/events';
import { Weapons } from '../../../shared/enums/weapons';
import { Notification } from '../../models/ui/notification';
import { NotificationTypes } from '../../../shared/enums/ui/notifications/types';

enum EventType {
  Client = "client",
  Server = "server"
}

interface Submenu {
  shouldClose: boolean,
  label: string,
  submenu: boolean | Submenu[] | Submenu,
  type: EventType,
  event: Events | JobEvents
}

interface Menu {
  shouldClose: boolean,
  label: string,
  submenu: boolean | Submenu[] | Submenu
}

const leoMenus: any = {
  shouldClose: false,
  label: "Police",
  submenu: [
    {
      shouldClose: false,
      label: "Cuffing",
      submenu: [
        {
          shouldClose: true,
          label: "Cuff",
          submenu: false,
          type: EventType.Server,
          event: JobEvents.cuffPlayer
        },
        {
          shouldClose: true,
          label: "Uncuff",
          submenu: false,
          type: EventType.Server,
          event: JobEvents.uncuffPlayer
        }
      ]
    },
    {
      shouldClose: false,
      label: "Vehicle",
      submenu: [
        {
          shouldClose: true,
          label: "Seat",
          submenu: false,
          type: EventType.Client,
          event: Events.trySeating
        },
        {
          shouldClose: true,
          label: "Unseat",
          submenu: false,
          type: EventType.Server,
          event: Events.unseatPlayer
        },
        {
          shouldClose: false,
          label: "Radar",
          submenu: false,
          type: EventType.Client,
          event: "Astrid_Radar:Client:ToggleRemote"
        }
      ]
    },
    {
      shouldClose: true,
      label: "Grab",
      submenu: false,
      type: EventType.Server,
      event: JobEvents.tryGrabbing
    },
    {
      shouldClose: true,
      label: "Unmask",
      submenu: false,
      type: EventType.Server,
      event: JobEvents.removeMask
    }
  ]
}

const menus: any = [
  {
    shouldClose: false,
    label: "Citizen",
    submenu: [
      {
        shouldClose: true,
        label: "Grab",
        submenu: false,
        type: EventType.Server,
        event: JobEvents.tryGrabbing
      },
      {
        shouldClose: true,
        label: "Seat",
        submenu: false,
        type: EventType.Client,
        event: Events.trySeating
      },
      {
        shouldClose: true,
        label: "Unseat",
        submenu: false,
        type: EventType.Server,
        event: Events.unseatPlayer
      },
      {
        shouldClose: true,
        label: "Drop Weapon",
        submenu: false,
        type: EventType.Client,
        event: Events.dropWeapon
      }
    ]
  }
]

export class HexMenu {
  private openedWindows: number[] = [];

  constructor() {
    Inform("Hex Menu | UI Controller", "Started!");

    // Keybind Mapping
    RegisterCommand("+open_hex_menu", () => {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.OpenHexMenu,
        data: menus
      }));

      SetCursorLocation(0.5, 0.5); // Sets the cursor to the center of the screen
      SetNuiFocus(true, true);
      Audio.playSoundFrontEnd("NAV", "HUD_AMMO_SHOP_SOUNDSET");
    }, false);

    // Events
    onNet(Events.dropWeapon, HexMenu.EVENT_dropWeapon.bind(this));
  }

  // Methods
  private registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.CloseHexMenu, (data, cb) => {
      SetNuiFocus(false, false);
      cb("ok");
    });

    RegisterNuiCallback(NuiCallbacks.HexEvent, async(data, cb) => {
      if (data.type === "server") {
        emitNet(data.event, data.parameters);
      } else {
        emit(data.event, data.parameters);
      }
      cb("ok");
    });
  }

  public init(): void {
    this.registerCallbacks();
  }

  public addPoliceOptions(): void {
    menus.push(leoMenus);
  }

  public removePoliceOptions(): void {
    // console.log("trying to find police menu!");
    const menuIndex = menus.findIndex(menu => menu.label === "Police");
    if (menuIndex !== -1) {
      // console.log("removing police options");
      menus.splice(menuIndex, 1);
    }
    // else {
    //   console.log("police menu not found!", menuIndex);
    // }
  }

  // Events
  private static async EVENT_dropWeapon(): Promise<void> {
    const myPed = Game.PlayerPed;
    const currWeapon = GetSelectedPedWeapon(myPed.Handle);

    console.log("ddd", myPed, currWeapon, Weapons.Unarmed);

    if (currWeapon !== Weapons.Unarmed) {
      SetPedDropsInventoryWeapon(myPed.Handle, currWeapon, 0, 2.0, 0, -1);
      const notify = new Notification("Weapon", "You've dropped your weapon on the ground.", NotificationTypes.Warning);
      await notify.send();
    } else {
      const notify = new Notification("Weapon", "You aren't armed!", NotificationTypes.Error);
      await notify.send();
    }
  }
}
