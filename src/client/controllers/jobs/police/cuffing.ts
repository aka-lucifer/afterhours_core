import { Game, InputMode, Model, Ped, Prop, Vector3, World } from "fivem-js";

import { Client } from "../../../client";
import {Delay, Error, getOffsetFromEntityInWorldCoords, Inform, LoadAnim, PlayAnim} from "../../../utils";

import { Progress } from '../../../models/ui/progress';

import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { CuffState } from "../../../../shared/enums/jobs/cuffStates";
import { Weapons } from "../../../../shared/enums/weapons";
import {Callbacks} from "../../../../shared/enums/events/callbacks";

import clientConfig from "../../../../configs/client.json";

export class Cuffing {
  private client: Client;

  // Animation Data
  private dictLoaded: boolean;
  private animDictionary: string = "rcmpaparazzo_3";


  // Cuff Tick
  private cuffTick: number = undefined;

  // Prop
  private handcuffs: Prop;
  private handcuffKeys: Prop;

  constructor(client: Client) {
    this.client = client;

    // Events
    onNet(JobEvents.startCuffing, this.EVENT_startCuffing.bind(this));
    onNet(JobEvents.setUncuffed, this.EVENT_setUncuffed.bind(this));

    // Callbacks
    this.client.cbManager.RegisterCallback(Callbacks.getCuffed, this.CALLBACK_getCuffed.bind(this));
    this.client.cbManager.RegisterCallback(Callbacks.startUncuffing, this.CALLBACK_startUncuffing.bind(this))

    Inform("Cuffing | Jobs (Police) Controller", "Started!");
  }

  // Methods
  public async init(): Promise<void> {
    await this.loadAnim(); // Load cuffing animation
  }

  public stop(): void {
    // Delete Handcuff Prop
    console.log("handcuff prop", this.handcuffs)
    if (this.handcuffs !== undefined) {
      if (this.handcuffs.Handle > 0) {
        if (this.handcuffs.exists()) {
          this.handcuffs.delete();
          this.handcuffs = undefined;
        }
      }
    }

    // Clear Handcuff Animation Tick
    if (this.cuffTick !== undefined) {
      clearTick(this.cuffTick);
      this.cuffTick = undefined;
    }

    if (IsEntityPlayingAnim(Game.PlayerPed.Handle, "mp_arresting", "idle", 3)) ClearPedTasks(Game.PlayerPed.Handle); // Stop cuffed animation
  }

  private async loadAnim(): Promise<void> {
    if (this.dictLoaded) return;
    
    while (!HasAnimDictLoaded(this.animDictionary)) {
      RequestAnimDict(this.animDictionary);
      await Delay(100);
    }

    this.dictLoaded = HasAnimDictLoaded(this.animDictionary);
  }

  private async disableControls(): Promise<void> {
    this.cuffTick = setTick(async() => {
      const cuffState = Player(this.client.Player.NetworkId).state.cuffState;
      if (cuffState == CuffState.BeingCuffed || cuffState == CuffState.Cuffed || cuffState == CuffState.Shackled) {
        const myPed = Game.PlayerPed;

        // Controls Disablers
        if (cuffState == CuffState.BeingCuffed) {
          Game.disableAllControlsThisFrame(InputMode.MouseAndKeyboard);
        } else if (cuffState == CuffState.Cuffed) {
          const disabledControls = clientConfig.controllers.police.cuffing.normal.controlDisablers;
          for (let i = 0; i < disabledControls.length; i++) {
            Game.disableControlThisFrame(InputMode.MouseAndKeyboard, disabledControls[i].value);
          }
        } else if (cuffState == CuffState.Shackled) {
          const disabledControls = clientConfig.controllers.police.cuffing.shackling.controlDisablers;
          for (let i = 0; i < disabledControls.length; i++) {
            Game.disableControlThisFrame(InputMode.MouseAndKeyboard, disabledControls[i].value);
          }
        }

        // Handles re-attaching handcuff prop if they fall of your body (change ped)
        if (this.handcuffs !== undefined) {
          if (this.handcuffs.exists()) {
            if (!this.handcuffs.isAttached()) {
              console.log("no longer attached, reattach!");
              const bone = GetPedBoneIndex(Game.PlayerPed.Handle, 18905);
              AttachEntityToEntity(this.handcuffs.Handle, Game.PlayerPed.Handle, bone, 0.005, 0.060, 0.03, -180.0, 280.0, 70.0, true, true, false, true, 1, true)
            }
          }
        }

        // replay default arrested anim if not playing it!
        if (cuffState === CuffState.Cuffed || cuffState === CuffState.Shackled) {
          if (!IsEntityPlayingAnim(myPed.Handle, "mp_arresting", "idle", 3)) {
            const loadedAnim = await LoadAnim("mp_arresting");
            if (loadedAnim) TaskPlayAnim(myPed.Handle, "mp_arresting", "idle", 8.0, -8.0, -1, 49, 0, false, false, false);
          }
        }
      } else {
        await Delay(1000);
      }
    })
  }
  
  // Events
  public async EVENT_startCuffing(): Promise<void> {
    try {
      const loadedAnim = await LoadAnim("mp_arrest_paired");

      if (loadedAnim) {
        await Delay(700);
        const myPed = Game.PlayerPed;
        const progress = new Progress(2000, {
          combat: true,
          movement: true
        }, undefined, async() => {
          await PlayAnim(myPed, "mp_arrest_paired", "cop_p2_back_right", 48, -1, 8.0, -8.0, 0, false, false, false);
        }, async () => {
          ClearPedTasks(myPed.Handle);
        })

        progress.start();
      }
    } catch(error) {
      Error("(init) Catch Error", error);
    }
  }

  private EVENT_setUncuffed(): void {
    this.stop();
  }

  // Callbacks
  private async CALLBACK_getCuffed(data: any, cb: CallableFunction): Promise<void> {
    const cuffer = new Ped(GetPlayerPed(GetPlayerFromServerId(Number(data.arresting))));
    const heading = cuffer.Heading;
    const myPed = Game.PlayerPed;

    // Sets our cuff statebag to cuffed
    const playerStates = Player(this.client.Player.NetworkId);
    playerStates.state.cuffState = CuffState.BeingCuffed;

    // Disables the control disabler with (hands up or kneeling)
    this.client.surrending.stopControlDisabler();
    await this.disableControls();

    // Clear any current animation or task playing
    ClearPedTasks(myPed.Handle);

    const loadAnim = await LoadAnim("mp_arrest_paired");
    // maybe wait (1000)
    if (loadAnim) {

      const offsetCoords = getOffsetFromEntityInWorldCoords(cuffer.Handle, new Vector3(0.0, 0.45, 0.0));
      SetEntityCoords(myPed.Handle, offsetCoords.x, offsetCoords.y, offsetCoords.z, true, false, false, false);
      await Delay(100);
      myPed.Heading = heading;
      const playingAnim = await PlayAnim(myPed, "mp_arrest_paired", "crook_p2_back_right", 32, -1, 8.0, -8.0, 0, false, false, false);
      if (playingAnim) {
        await Delay(3000); // maybe 4200
        const loadAnim2 = await LoadAnim("mp_arresting");
        if (loadAnim2) {
          const playingAnim2 = await PlayAnim(myPed, "mp_arresting", "idle", 49, -1, 8.0, -8.0, 0, false, false, false);
          if (playingAnim2) {
            const handcuffModel = new Model("p_cs_cuffs_02_s");
            const loadedModel = await handcuffModel.request(2000);
            if (loadedModel) {
              if (this.handcuffs !== undefined) {
                if (this.handcuffs.exists()) {
                  this.handcuffs.delete();
                  this.handcuffs = undefined;
                }
              }

              this.handcuffs = await World.createProp(handcuffModel, Game.PlayerPed.Position, false, false);
              const bone = GetPedBoneIndex(Game.PlayerPed.Handle, 18905);
              AttachEntityToEntity(this.handcuffs.Handle, Game.PlayerPed.Handle, bone, 0.005, 0.060, 0.03, -180.0, 280.0, 70.0, true, true, false, true, 1, true);
            }

            SetEnableHandcuffs(myPed.Handle, true);
            SetCurrentPedWeapon(myPed.Handle, Weapons.Unarmed, false);
            playerStates.state.cuffState = CuffState.Cuffed;
            cb(true);
          }
        }
      }
    }
  }

  private async CALLBACK_startUncuffing(data: any, cb: CallableFunction): Promise<void> {
    const loadAnim = await LoadAnim("mp_arresting");
    if (loadAnim) {
      const handcuffModel = new Model("gr_prop_gr_jailer_keys_01a");
      const loadedModel = await handcuffModel.request(2000);
      if (loadedModel) {
        const progress = new Progress(2000, {
          combat: true,
          movement: true
        }, () => {
          cb(false);
        }, async () => {
          await PlayAnim(Game.PlayerPed, "mp_arresting", "a_uncuff", 49, -1, 8.0, -8.0, 0, false, false, false);
          this.handcuffKeys = await World.createProp(handcuffModel, Game.PlayerPed.Position, false, false);
          const bone = GetPedBoneIndex(Game.PlayerPed.Handle, 64017);
          AttachEntityToEntity(this.handcuffKeys.Handle, Game.PlayerPed.Handle, bone, -0.04, -0.05, -0.01, -67.4, 80.0, 130.0, true, true, false, true, 1, true);
        }, async () => {
          if (this.handcuffKeys !== undefined) {
            if (this.handcuffKeys.Handle > 0) {
              if (this.handcuffKeys.exists()) {
                StopAnimTask(Game.PlayerPed.Handle, "mp_arresting", "a_uncuff", 1.0);
                ClearPedTasks(Game.PlayerPed.Handle);
                this.handcuffKeys.delete();
                this.handcuffKeys = undefined;
              }
            }
          }

          cb(true);
        })

        progress.start();
      }
    }
  }
}
