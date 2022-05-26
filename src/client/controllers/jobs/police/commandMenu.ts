import { Color, Control, Game, InputMode, MarkerType, Screen, Vector3, World } from 'fivem-js';

import { Client } from '../../../client';

import { Menu } from '../../../models/ui/menu/menu';

import { PolyZone } from '../../../helpers/polyZone';

import clientConfig from '../../../../configs/client.json';
import { Delay } from '../../../utils';
import { MenuPositions } from '../../../../shared/enums/ui/menu/positions';
import { ServerCallback } from '../../../models/serverCallback';
import { JobCallbacks } from '../../../../shared/enums/events/jobs/jobCallbacks';
import { Jobs } from '../../../../shared/enums/jobs/jobs';
import { CountyRanks } from '../../../../shared/enums/jobs/ranks';
import { Submenu } from '../../../models/ui/menu/submenu';
import { JobEvents } from '../../../../shared/enums/events/jobs/jobEvents';

interface MenuLocation {
  coords: Vector3,
  type: string
}

export class CommandMenu {
  // Main Data
  private client: Client;
  private menu: Menu;
  private units: Submenu;

  // Location Data
  private menuLocations: MenuLocation[] = [];
  private locations: PolyZone[] = [];

  private createdZones: boolean = false;
  private usingMenu: boolean = false;

  // Ticks
  private distTick: number = undefined;
  private interactionTick: number = undefined;

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public init(): void {
    const configLocations = clientConfig.controllers.police.bossMenu.locations;
    for (let i = 0; i < configLocations.length; i++) {
      this.menuLocations.push({
        coords: new Vector3(configLocations[i].x, configLocations[i].y, configLocations[i].z),
        type: configLocations[i].location
      });
    }

    console.log("creates zones!");

    this.menu = new Menu("Unit Management Menu", GetCurrentResourceName(), MenuPositions.MiddleRight);
    this.units = this.menu.BindSubmenu("Units");
  }

  public start(): void {
    console.log("create commandMenu zones!");

    if (this.distTick === undefined) this.distTick = setTick(async() => {
      for (let i = 0; i < this.menuLocations.length; i++) {
        if (this.client.Character.job.name == this.menuLocations[i].type) {
          if (this.menuLocations[i].type == Jobs.County) {
            if (this.client.Character.job.rank >= CountyRanks.Patrol_Lieutenant) {
              if (!this.usingMenu) {
                if (!IsPedInAnyVehicle(Game.PlayerPed.Handle, false)) {
                  let dist = Game.PlayerPed.Position.distance(this.menuLocations[i].coords);
                  if (dist <= 5) {

                    if (this.interactionTick === undefined) this.interactionTick = setTick(() => {
                      dist = Game.PlayerPed.Position.distance(this.menuLocations[i].coords);
                      World.drawMarker(
                        MarkerType.HorizontalBars,
                        this.menuLocations[i].coords,
                        new Vector3(0, 0, 0),
                        new Vector3(0, 0, 0),
                        new Vector3(1, 1, 1),
                        Color.fromRgb(19, 148, 235),
                        false,
                        true,
                        false,
                        null,
                        null,
                        false
                      );

                      if (dist <= 1.5) {
                        Screen.displayHelpTextThisFrame("~INPUT_CONTEXT~ to access the unit menu");

                        if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.Context)) {
                          this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.getUnits, { type: this.menuLocations[i].type }, async(cbData, passedData) => {
                            this.client.menuManager.emptyMenu(this.units.handle); // Empty previous contents

                            for (let i = 0; i < cbData.length; i++) {
                              const submenu = this.units.BindSubmenu(`[${cbData[i].callsign}] | ${cbData[i].firstName}. ${cbData[i].lastName} - ${cbData[i].rank}`);

                              const fireButton = submenu.BindButton("Fire Unit", () => {
                                console.log(`fire [${cbData[i].callsign}] | ${cbData[i].firstName}. ${cbData[i].lastName} - ${cbData[i].rank}`);
                                emitNet(JobEvents.fireUnit, cbData[i].id, cbData[i].playerId);
                                this.client.menuManager.deleteMenu(submenu.handle);
                              });
                            }

                            await this.menu.Open();
                          }));
                        }
                      }
                    });
                  } else {
                    if (this.interactionTick !== undefined) {
                      clearTick(this.interactionTick);
                      this.interactionTick = undefined;
                    }
                  }
                }
              }
            }
          }
        }
      }

      await Delay(1000);
    });
  }

  public stop(): void {
    console.log("stop!");
  }
}
