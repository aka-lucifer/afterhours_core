import {
  Blip,
  Color,
  Control,
  Game,
  InputMode,
  Screen,
  Vector3,
  World,
} from 'fivem-js';

import { Client } from '../../../client';
import { Delay, Inform } from '../../../utils';

import { Menu } from '../../../models/ui/menu/menu';
import { ServerCallback } from '../../../models/serverCallback';
import { Submenu } from '../../../models/ui/menu/submenu';
import { Notification } from '../../../models/ui/notification';

import { MarkerData } from "../../../interfaces/ui/marker";
import { BlipData } from "../../../interfaces/ui/blip";

import clientConfig from '../../../../configs/client.json';

import { MenuPositions } from '../../../../shared/enums/ui/menu/positions';
import { JobCallbacks } from '../../../../shared/enums/events/jobs/jobCallbacks';
import { JobLabels, Jobs } from '../../../../shared/enums/jobs/jobs';
import { CountyRanks, PoliceRanks, StateRanks } from '../../../../shared/enums/jobs/ranks';
import { NotificationTypes } from '../../../../shared/enums/ui/notifications/types';
import { Ranks } from '../../../../shared/enums/ranks';
import { getRankFromValue } from '../../../../shared/utils';

interface MenuLocation {
  coords: Vector3,
  type: string,
  label: string,
  marker: MarkerData,
  blip: Blip
}

export class CommandMenu {
  // Main Data
  private client: Client;

  // Location Data
  private menuLocations: MenuLocation[] = [];
  private currentPos: Vector3 = undefined;

  // Menu Data
  private menu: Menu;
  private units: Submenu;
  private recruitment: Submenu;

  private usingMenu: boolean = false;

  // Ticks
  private distTick: number = undefined;
  private interactionTick: number = undefined;

  constructor(client: Client) {
    this.client = client;

    Inform("Command Menu | Jobs (Police) Controller", "Started!");
  }

  public get Open(): boolean {
    return this.usingMenu;
  }

  public set Open(newValue: boolean) {
    this.usingMenu = newValue;
  }

  // Methods
  public init(): void {
    if (this.menuLocations.length > 0) { // If menu locations already has entries
      for (let i = 0; i < this.menuLocations.length; i++) {
        const blip = new Blip(this.menuLocations[i].blip.Handle);
        blip.delete();
        this.menuLocations.splice(i, 1);
      }
    }

    const configLocations = clientConfig.controllers.police.bossMenu.locations;
    for (let i = 0; i < configLocations.length; i++) {
      const position = new Vector3(configLocations[i].x, configLocations[i].y, configLocations[i].z);
      const marker: MarkerData = clientConfig.controllers.police.bossMenu.markerData;
      const blipData: BlipData = clientConfig.controllers.police.bossMenu.blipData;

      // Blip Creation
      let namePrefix = "Command Menu Rank NOT FOUND";
      switch (configLocations[i].rank) {
        case Jobs.Police:
          namePrefix = JobLabels.Police;
          break;
        case Jobs.County:
          namePrefix = JobLabels.County;
          break;
        case Jobs.State:
          namePrefix = JobLabels.State;
          break;
      }

      const blip = World.createBlip(position);
      blip.Sprite = blipData.sprite;
      blip.Color = blipData.colour;
      blip.Name = `${namePrefix} | Unit Management`;
      blip.Scale = 0.7;
      blip.Alpha = 0;

      this.menuLocations.push({
        coords: position,
        type: configLocations[i].rank,
        label: configLocations[i].label,
        marker: marker,
        blip: blip
      });
    }

    console.log("creates zones!");

    this.menu = new Menu("Unit Management Menu", GetCurrentResourceName(), MenuPositions.MiddleRight);
    this.units = this.menu.BindSubmenu("Units");
    this.recruitment = this.menu.BindSubmenu("Recruitment");
  }

  public start(): void {
    if (this.distTick === undefined) this.distTick = setTick(async() => {
      for (let a = 0; a < this.menuLocations.length; a++) {
        if (this.client.Character.job.name == this.menuLocations[a].type) { // If you have the correct job (Police, State, County, Fire/EMS)
          if (this.client.Character.job.isBoss) { // If you are a boss
            if (this.client.Character.job.status) { // If you are on duty
              if (!this.usingMenu) {
                if (!IsPedInAnyVehicle(Game.PlayerPed.Handle, false)) {
                  let dist = Game.PlayerPed.Position.distance(this.menuLocations[a].coords);

                  if (dist <= 10) {
                    this.currentPos = this.menuLocations[a].coords;

                    if (this.interactionTick === undefined) this.interactionTick = setTick(() => {
                      if (!this.usingMenu) {
                        dist = Game.PlayerPed.Position.distance(this.menuLocations[a].coords);
                        World.drawMarker(
                          this.menuLocations[a].marker.type,
                          this.menuLocations[a].coords,
                          new Vector3(0, 0, 0),
                          new Vector3(0, 0, 0),
                          new Vector3(1, 1, 1),
                          Color.fromRgb(this.menuLocations[a].marker.colour.r, this.menuLocations[a].marker.colour.g, this.menuLocations[a].marker.colour.b),
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
                            this.client.menuManager.emptyMenu(this.units.handle);
                            this.client.menuManager.emptyMenu(this.recruitment.handle);

                            // Units Menu
                            this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.getUnits, { type: this.menuLocations[a].type }, async (receievedUnits, passedData) => {

                              // Get dept rank
                              let ranks;

                              if (this.menuLocations[a].type == Jobs.State) {
                                ranks = StateRanks;
                              } else if (this.menuLocations[a].type == Jobs.Police) {
                                ranks = PoliceRanks;
                              } else if (this.menuLocations[a].type == Jobs.County) {
                                ranks = CountyRanks;
                              }

                              // Loop through all department characters
                              for (let b = 0; b < receievedUnits.length; b++) {
                                const submenu = this.units.BindSubmenu(`[${receievedUnits[b].callsign}] | ${receievedUnits[b].firstName}. ${receievedUnits[b].lastName} - ${receievedUnits[b].rank}`);

                                const promoteMenu = submenu.BindSubmenu("Promote Unit");

                                for (let c = 0; c < Object.keys(ranks).length / 2; c++) {
                                  if (c < this.client.Character.job.rank || this.client.player.Rank >= Ranks.SeniorAdmin) { // If the available ranks are less than your rank
                                    const rankLabel = await getRankFromValue(c, this.menuLocations[a].type);

                                    const promoteButton = promoteMenu.BindButton(rankLabel, () => {
                                      this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.promoteUnit, {
                                        unitsId: receievedUnits[b].id,
                                        unitsPlayerId: receievedUnits[b].playerId,
                                        job: this.menuLocations[a].type,
                                        newRank: c,
                                        callsign: receievedUnits[b].callsign
                                      }, async (promotedUnit, passedData) => {
                                        if (promotedUnit) {
                                          await this.client.menuManager.CloseMenu();

                                          const notify = new Notification("Unit Management", `Promoted [${receievedUnits[b].callsign}] | ${receievedUnits[b].firstName}. ${receievedUnits[b].lastName}, to the rank of (${rankLabel}).`, NotificationTypes.Info);
                                          await notify.send();
                                        } else {
                                          const notify = new Notification("Unit Management", `Unsuccessful in promoting unit, make a support ticket!`, NotificationTypes.Error);
                                          await notify.send();
                                        }
                                      }));
                                    });
                                  }
                                }

                                const fireButton = submenu.BindButton("Fire Unit", () => {
                                  this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.fireUnit, {
                                    unitsId: receievedUnits[b].id,
                                    unitsPlayerId: receievedUnits[b].playerId,
                                  }, async (firedUnit, passedData) => {
                                    if (firedUnit) {
                                      await this.client.menuManager.deleteMenu(submenu.handle);

                                      const notify = new Notification("Unit Management", `Fired [${receievedUnits[b].callsign}] | ${receievedUnits[b].firstName}. ${receievedUnits[b].lastName} - ${receievedUnits[b].rank}`, NotificationTypes.Info);
                                      await notify.send();
                                    } else {
                                      const notify = new Notification("Unit Management", `Unsuccessful in firing unit, make a support ticket!`, NotificationTypes.Error);
                                      await notify.send();
                                    }
                                  }));
                                });
                              }

                              // Loop through all players
                              const svPlayers = this.client.Players;

                              for (let b = 0; b < svPlayers.length; b++) {
                                if (svPlayers[b].NetworkId !== this.client.player.NetworkId) { // If not you
                                  if (svPlayers[b].Spawned) {
                                    if (svPlayers[b].Character.job.name !== this.menuLocations[a].type) { // If they are a civilian
                                      const playerMenu = this.recruitment.BindSubmenu(`${svPlayers[b].Name} | ${svPlayers[b].Character.firstName} ${svPlayers[b].Character.lastName}`);

                                      for (let c = 0; c < Object.keys(ranks).length / 2; c++) {
                                        if (c < this.client.Character.job.rank || this.client.player.Rank >= Ranks.SeniorAdmin) { // If the available ranks are less than your rank
                                          const rankLabel = await getRankFromValue(c, this.menuLocations[a].type);
                                          const rankButton = playerMenu.BindButton(rankLabel, () => {

                                            this.client.serverCallbackManager.Add(new ServerCallback(JobCallbacks.recruitPlayer, {
                                              unitsNet: svPlayers[b].NetworkId,
                                              jobName: this.menuLocations[a].type,
                                              jobRank: c,
                                              jobLabel: rankLabel
                                            }, async (recruitedUnit, passedData) => {
                                              if (recruitedUnit) {
                                                await this.client.menuManager.CloseMenu();

                                                const notify = new Notification("Unit Management", `Recruited ${svPlayers[b].Character.firstName} ${svPlayers[b].Character.lastName}, To ${ranks[c]}.`, NotificationTypes.Info);
                                                await notify.send();
                                              } else {
                                                const notify = new Notification("Unit Management", "Unsuccessful in recruitign unit, make a support ticket!", NotificationTypes.Error);
                                                await notify.send();
                                              }
                                            }));
                                          });
                                        }
                                      }
                                    }
                                  }
                                }
                              }


                              // Open the menu
                              await this.menu.Open();
                              this.usingMenu = true;
                            }));
                          }
                        }
                      }
                    });
                  }
                }
              }
            } else {
              if (this.interactionTick !== undefined) {
                clearTick(this.interactionTick);
                this.interactionTick = undefined;
              }
            }
          } else {
            if (this.interactionTick !== undefined) {
              clearTick(this.interactionTick);
              this.interactionTick = undefined;
            }
          }
        }
      }

      if (this.currentPos !== undefined) {
        if (this.currentPos.distance(Game.PlayerPed.Position) > 15) {
          this.currentPos = undefined;

          if (this.interactionTick !== undefined) {
            clearTick(this.interactionTick);
            this.interactionTick = undefined;
          }
        }
      }

      await Delay(1000);
    });
  }

  public stop(): void {
    if (this.distTick !== undefined) {
      clearTick(this.distTick);
      this.distTick = undefined;
    }

    if (this.interactionTick !== undefined) {
      clearTick(this.interactionTick);
      this.interactionTick = undefined;
    }
  }

  // Events
  public toggleBlips(toggleState: boolean): void {
    for (let i = 0; i < this.menuLocations.length; i++) {
      if (this.client.Character.job.name == this.menuLocations[i].type) {
        if (toggleState) {
          const blip = new Blip(this.menuLocations[i].blip.Handle);
          blip.Alpha = 255;
        } else {
          const blip = new Blip(this.menuLocations[i].blip.Handle);
          blip.Alpha = 0;
        }
      }
    }
  }
}
