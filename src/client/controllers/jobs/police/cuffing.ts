import { EntityBone, Game, InputMode, Model, Ped, Prop, Vector3, World } from "fivem-js";

import { Client } from "../../../client";
import { Delay, Error, Inform, LoadAnim, PlayAnim } from "../../../utils";

import { Notification } from "../../../models/ui/notification";

import { JobEvents } from "../../../../shared/enums/events/jobs/jobEvents";
import { CuffState } from "../../../../shared/enums/jobs/cuffStates";
import { Weapons } from "../../../../shared/enums/weapons";
import { NotificationTypes } from "../../../../shared/enums/ui/notifications/types";
import { Sounds } from "../../../../shared/enums/sounds";

import clientConfig from "../../../../configs/client.json";
import { Progress } from '../../../models/ui/progress';

enum ArrestPositionEnum {
  Back,
  Front
}

enum RoleEnum {
  Perp,
  Cop
}

export class Cuffing {
  private client: Client;

  // Animation Data
  private dictLoaded: boolean;
  private animDictionary: string = "rcmpaparazzo_3";
  private copAnim: string = "poppy_arrest_cop";
	private perpAnim: string = "poppy_arrest_popm";
	private backArrestStartSceneTime: number = 0.6;
	private frontArrestStartSceneTime: number = 0.56;
  private sceneStopTime: number = 0.64;

  // Cuff Tick
  private cuffTick: number = undefined;

  // Prop
  private handcuffs: Prop;
  private handcuffKeys: Prop;

  constructor(client: Client) {
    this.client = client;
    console.log("staff cuff")

    // Events
    onNet(JobEvents.startCuffing, this.EVENT_startCuffing.bind(this));
    onNet(JobEvents.startUncuffing, this.EVENT_startUncuffing.bind(this));
    onNet(JobEvents.playPerpBackAnim, this.EVENT_playPerpBackAnim.bind(this));
    onNet(JobEvents.playPerpFrontAnim, this.EVENT_playPerpFrontAnim.bind(this));
    onNet(JobEvents.setCuffed, this.EVENT_setCuffed.bind(this));
    onNet(JobEvents.setUncuffed, this.EVENT_setUncuffed.bind(this));

    // RegisterCommand("uncuff", async() => {
    //   const handcuffModel = new Model("gr_prop_gr_jailer_keys_01a");
    //   const loadedModel = await handcuffModel.request(2000);
    //   if (loadedModel) {
    //     await PlayAnim(Game.PlayerPed, "mp_arresting", "a_uncuff", 49, -1, 8.0, -8.0, 0, false, false, false);
    //     this.handcuffKeys = await World.createProp(handcuffModel, Game.PlayerPed.Position, false, false);
    //     const bone = GetPedBoneIndex(Game.PlayerPed.Handle, 64017);
    //     AttachEntityToEntity(this.handcuffKeys.Handle, Game.PlayerPed.Handle, bone, -0.04, -0.05, -0.01, -67.4, 80.0, 130.0, true, true, false, true, 1, true);
    //   }
    // }, false);
    //
    // RegisterCommand("uncuff_stop", async() => {
    //   if (this.handcuffKeys !== undefined) {
    //     if (this.handcuffKeys.Handle > 0) {
    //       if (this.handcuffKeys.exists()) {
    //         ClearPedTasks(Game.PlayerPed.Handle);
    //         this.handcuffKeys.delete();
    //         this.handcuffKeys = undefined;
    //       }
    //     }
    //   }
    // }, false);

    Inform("Jobs (Police) | Cuffing Controller", "Started!");
  }

  // Methods
  public async init(): Promise<void> {
    await this.loadAnim(); // Load cuffing animation
  }

  public stop(): void {
    // Delete Handcuff Prop
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

    // Delete Handcuff Keys Prop
    if (this.handcuffKeys !== undefined) {
      if (this.handcuffKeys.Handle > 0) {
        if (this.handcuffKeys.exists()) {
          this.handcuffKeys.delete();
          this.handcuffKeys = undefined;
        }
      }
    }
  }

  private async loadAnim(): Promise<void> {
    if (this.dictLoaded) return;
    
    while (!HasAnimDictLoaded(this.animDictionary)) {
      RequestAnimDict(this.animDictionary);
      await Delay(100);
    }

    this.dictLoaded = HasAnimDictLoaded(this.animDictionary);
  }

  private withinStartPosition(startPos: Vector3): boolean {
    const dist = Game.PlayerPed.Position.distanceSquared(startPos);
    console.log("start dist", dist);
    
    if (dist < 10) return true;

		// Fail gracefully
		Inform("IsStartPositionInRange", "Destination for scene unusually far: {distanceToStartPos}");
		return false;
  }

  private getClientPositionToPerp(perpPosition: Vector3, heading: number): number {
    const clientPos = Game.PlayerPed.Position;

    const backPos = GetObjectOffsetFromCoords(perpPosition.x, perpPosition.y, perpPosition.z, heading, 0, -0.5, 0);
    const frontPos = GetObjectOffsetFromCoords(perpPosition.x, perpPosition.y, perpPosition.z, heading, 0, 0.5, 0);

    const backDist = clientPos.distanceSquared(new Vector3(backPos[0], backPos[1], backPos[2]));
    const frontDist = clientPos.distanceSquared(new Vector3(frontPos[0], frontPos[1], frontPos[2]));

    if (backDist - 0.1 <= frontDist) {
      return -1;
    }

    return 1;
  }

  private getArrestPosition(perpPosition: Vector3, heading: number): ArrestPositionEnum {
    if (this.getClientPositionToPerp(perpPosition, heading) > 0) {
      return ArrestPositionEnum.Front;
    }

    return ArrestPositionEnum.Back;
  }

  private async playSceneAnimation(handle: number, position: Vector3, rotation: Vector3, role: RoleEnum, arrestPosition: ArrestPositionEnum): Promise<void> {
    const anim: string = role == RoleEnum.Cop ? this.copAnim : this.perpAnim;
    const animLength: number = arrestPosition == ArrestPositionEnum.Front ? this.frontArrestStartSceneTime : this.backArrestStartSceneTime;

    TaskGoStraightToCoord(Game.PlayerPed.Handle, position.x, position.y, position.z, 1.0, 5000, rotation.z, 6.0);
    await Delay(600);
    TaskPlayAnimAdvanced(handle, this.animDictionary, anim, position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, 8.0, -8.0, 5250, 262152, animLength, 2, 0);
  }
  
  private getCopAnimFrontStartPosition(perpPosition: Vector3, perpHeading: number): Vector3 {
    const magicRotationOffset = 8.569;
		const vectorHeading = perpHeading + magicRotationOffset;

    const cosx = Math.cos(vectorHeading * (Math.PI / 180));
		const siny = Math.sin(vectorHeading * (Math.PI / 180));

		const vectorMagnitude = 0.9405;
		const deltax = (vectorMagnitude * cosx);
		const deltay = (vectorMagnitude * siny);

    const pos = perpPosition.add(new Vector3(deltax, deltay, 0));
		return new Vector3(pos.x, pos.y, pos.z);
  }

  private getCopAnimFrontStartRotation(copRotation: Vector3, perpHeading: number): Vector3 {
    const offsetCopHeadingFromPed = 167;
		return new Vector3(copRotation.x, copRotation.y, perpHeading + offsetCopHeadingFromPed);
  }

  private getCopAnimBackStartPosition(perpPosition: Vector3, perpHeading: number): Vector3 {
    let magicRotationOffset = 68.20297;
		let vectorHeading = perpHeading + magicRotationOffset;

		const sinx = Math.sin(vectorHeading * (Math.PI / 180));
		magicRotationOffset = -21.802;
		vectorHeading = perpHeading + magicRotationOffset;
		const siny = Math.sin(vectorHeading * (Math.PI / 180));

		const vectorMagnitude = 0.5385;
		const deltax = (vectorMagnitude * sinx);
		const deltay = (vectorMagnitude * siny);

    const pos = perpPosition.add(new Vector3(deltax, deltay, 0));
		return new Vector3(pos.x, pos.y, pos.z);
  }

  private getCopAnimBackStartRotation(copRotation: Vector3, perpHeading: number): Vector3 {
    const offsetCopHeadingFromPed = 53.0;
		return new Vector3(copRotation.x, copRotation.y, perpHeading + offsetCopHeadingFromPed);
  }

  private perpFrontAnim(perpHandle: number, perpPosition: Vector3, perpRotation: Vector3): void {
    const offsetToRetainPerpStartHeadingUponAnimFinish = -65.567;
    this.playSceneAnimation(perpHandle, perpPosition, new Vector3(perpRotation.x, perpRotation.y, perpRotation.z + offsetToRetainPerpStartHeadingUponAnimFinish), RoleEnum.Perp, ArrestPositionEnum.Front);
  }

  private perpBackAnim(perpHandle: number, perpPosition: Vector3, perpRotation: Vector3): void {
    const offsetToRetainPerpStartHeadingUponAnimFinish = -38.8;
    this.playSceneAnimation(perpHandle, perpPosition, new Vector3(perpRotation.x, perpRotation.y, perpRotation.z + offsetToRetainPerpStartHeadingUponAnimFinish), RoleEnum.Perp, ArrestPositionEnum.Back);
  }

  private copFrontAnim(copHandle: number, perpPosition: Vector3, perpHeading: number): void {
    const cop = new Ped(copHandle);
    if (!cop.exists()) return;

    const copAnimPos = this.getCopAnimFrontStartPosition(perpPosition, perpHeading);
    const copAnimRot = this.getCopAnimFrontStartRotation(cop.Rotation, perpHeading);

    this.playSceneAnimation(copHandle, copAnimPos, copAnimRot, RoleEnum.Cop, ArrestPositionEnum.Front);
  }

  private copBackAnim(copHandle: number, perpPosition: Vector3, perpHeading: number): void {
    const cop = new Ped(copHandle);
    if (!cop.exists()) return;

    const copAnimPos = this.getCopAnimBackStartPosition(perpPosition, perpHeading);
    const copAnimRot = this.getCopAnimBackStartRotation(cop.Rotation, perpHeading);

    this.playSceneAnimation(copHandle, copAnimPos, copAnimRot, RoleEnum.Cop, ArrestPositionEnum.Back);
  }

  private async waitForCompletion(handle: number, role: RoleEnum, arrestPosition: ArrestPositionEnum, perpHandle: number): Promise<void> {
    const sceneStartTime = arrestPosition == ArrestPositionEnum.Front ? this.frontArrestStartSceneTime: this.backArrestStartSceneTime;
		const anim = role == RoleEnum.Cop ? this.copAnim : this.perpAnim;
		let currentSceneTime = sceneStartTime;
		let hasCuffEventOccurred = false;

    try {
      while (currentSceneTime < this.sceneStopTime) {
        currentSceneTime = GetEntityAnimCurrentTime(handle, this.animDictionary, anim);
        if (!hasCuffEventOccurred && currentSceneTime >= this.sceneStopTime) {
          if (perpHandle > 0) {
            console.log("handcuff ped");
            global.exports["xsound"].PlayUrlPos("handcuff", Sounds.Handcuff, 0.3, Game.PlayerPed.Position, false);
          } else if (role == RoleEnum.Cop) {
            console.log("play handcuff sound 2!");
          } else {
            console.log("handcuff ped!");
          }

          hasCuffEventOccurred = true;
        }

        await Delay(10);
      }
    } catch(error) {
      Error("(waitForCompletion) Catch Error", error);
    }
  }
  
  // Events
  public async EVENT_startCuffing(netToArrest: number): Promise<void> {
    try {
      const loadedAnim = await LoadAnim("mp_arresting");

      if (loadedAnim) {
        const player = GetPlayerFromServerId(netToArrest);
        const pedHandle = GetPlayerPed(player);
        const perp = new Ped(pedHandle);
        
        if (!perp.exists()) return;

        const perpCurrPos = perp.Position;
        const perpCurrRot = perp.Rotation;

        if (!this.withinStartPosition(perpCurrPos)) return;

        const arrestPosition = this.getArrestPosition(perpCurrPos, perpCurrRot.z);

        if (arrestPosition == ArrestPositionEnum.Front) {
          console.log("play front anim!");
          emitNet(JobEvents.doPerpFrontAnim, netToArrest, perpCurrPos, perpCurrRot);
          this.copFrontAnim(Game.PlayerPed.Handle, perpCurrPos, perpCurrRot.z);
        } else {
          console.log("play back anim!");
          emitNet(JobEvents.doPerpBackAnim, netToArrest, perpCurrPos, perpCurrRot);
          this.copBackAnim(Game.PlayerPed.Handle, perpCurrPos, perpCurrRot.z);
        }

        await this.waitForCompletion(Game.PlayerPed.Handle, RoleEnum.Cop, arrestPosition, perp.Handle);
        ClearPedTasks(Game.PlayerPed.Handle);
        emitNet(JobEvents.setFinished, netToArrest); // Clears tasks on the perp after completing anim
      }
    } catch(error) {
      Error("(init) Catch Error", error);
    }
  }

  private async EVENT_startUncuffing(): Promise<void> {
    const loadedAnim = await LoadAnim("mp_arresting");

    if (loadedAnim) {
      const handcuffModel = new Model("gr_prop_gr_jailer_keys_01a");
      const loadedModel = await handcuffModel.request(2000);
      if (loadedModel) {
        const progress = new Progress(2000, {
          combat: true,
          movement: true
        }, undefined, async() => {
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
        })

        progress.start();
      }
    }
  }

  private async EVENT_playPerpBackAnim(perpPos: Vector3, perpRot: Vector3): Promise<void> {
    await this.loadAnim(); // Make sure the anim dict is loaded
    const myPed = Game.PlayerPed;
    this.perpBackAnim(myPed.Handle, perpPos, perpRot);
  }

  private async EVENT_playPerpFrontAnim(perpPos: Vector3, perpRot: Vector3): Promise<void> {
    await this.loadAnim(); // Make sure the anim dict is loaded
    const myPed = Game.PlayerPed;
    ClearPedTasks(myPed.Handle);
    this.perpFrontAnim(myPed.Handle, perpPos, perpRot);
  }

  private async EVENT_setCuffed(): Promise<void> {
    const cuffState = Player(this.client.Player.NetworkId).state.cuffState;
    if (cuffState == CuffState.BeingCuffed || cuffState == CuffState.Cuffed || cuffState == CuffState.Shackled) {
      // attach prop here
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
        AttachEntityToEntity(this.handcuffs.Handle, Game.PlayerPed.Handle, bone, 0.005, 0.060, 0.03, -180.0, 280.0, 70.0, true, true, false, true, 1, true)
        
        // Prevents them from pulling out weapons
        SetEnableHandcuffs(Game.PlayerPed.Handle, true);

        // If they aren't unarmed, make them unarmed
        if (GetSelectedPedWeapon(Game.PlayerPed.Handle) !== Weapons.Unarmed) {
          SetCurrentPedWeapon(Game.PlayerPed.Handle, Weapons.Unarmed, true); // Set them unarmed
        }

        const notify = new Notification("Jobs", "Handcuffed", NotificationTypes.Info);
        await notify.send();

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
            if (!IsEntityPlayingAnim(myPed.Handle, "mp_arresting", "idle", 3)) {
              const loadedAnim = await LoadAnim("mp_arresting");
              if (loadedAnim) TaskPlayAnim(myPed.Handle, "mp_arresting", "idle", 8.0, -8.0, -1, 49, 0, false, false, false);
            }
          } else {
            await Delay(1000);
          }
        })
      }
    }
  }

  private EVENT_setUncuffed(): void {
    this.stop();
  }
}
