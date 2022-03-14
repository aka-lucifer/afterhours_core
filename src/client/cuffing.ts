import { Game, Ped, Vector3 } from "fivem-js";
import { Vec3 } from "fivem-js/lib/utils/Vector3";
import { Delay, Error, Inform, PlayAnim } from "./utils";

enum ArrestPositionEnum {
  Back,
  Front
}

enum RoleEnum {
  Perp,
  Cop
}

export class CuffingStuff {
  private dictLoaded: boolean;
  private animDictionary: string = "rcmpaparazzo_3";
  private copAnim: string = "poppy_arrest_cop";
	private perpAnim: string = "poppy_arrest_popm";
	private backArrestStartSceneTime: number = 0.6;
	private frontArrestStartSceneTime: number = 0.56;
  private sceneStopTime: number = 0.64;

  constructor() {
    console.log("cuffing start");
  }

  // Methods
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
            console.log("play handcuff sound!");
          } else if (role == RoleEnum.Cop) {
            console.log("play handcuff sound!");
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
  
  public async init(pedToArrest: number): Promise<void> {
    try {
      await this.loadAnim();

      const perp = new Ped(pedToArrest);
      if (!perp.exists()) return;

      const perpCurrPos = perp.Position;
      const perpCurrRot = perp.Rotation;

      if (!this.withinStartPosition(perpCurrPos)) return;

      const arrestPosition = this.getArrestPosition(perpCurrPos, perpCurrRot.z);

      if (arrestPosition == ArrestPositionEnum.Front) {
        console.log("play front anim!");
        this.perpFrontAnim(perp.Handle, perpCurrPos, perpCurrRot);
        this.copFrontAnim(Game.PlayerPed.Handle, perpCurrPos, perpCurrRot.z);
      } else {
        console.log("play back anim!");
        this.perpBackAnim(perp.Handle, perpCurrPos, perpCurrRot);
        this.copBackAnim(Game.PlayerPed.Handle, perpCurrPos, perpCurrRot.z);
      }

      await this.waitForCompletion(Game.PlayerPed.Handle, RoleEnum.Cop, arrestPosition, perp.Handle);
      ClearPedTasks(Game.PlayerPed.Handle);
      ClearPedTasks(perp.Handle);

      await PlayAnim(perp, "mp_arresting", "idle", 49, -1, 8.0, -8.0, 0, false, false, false);
    } catch(error) {
      Error("(init) Catch Error", error);
    }
  }
}