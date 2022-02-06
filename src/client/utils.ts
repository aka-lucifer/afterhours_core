import { Colour } from "../shared/models/utils/colour";
import { Vector3, Ped, World, Font, Game } from "fivem-js";

/**
 * @param reference Title for organisation logs
 * @param message Log message
*/

onNet("logMessage", Log);

export function Log(reference: string, message: string): void {
  console.log(`[^2LOG^7]\t[^2${reference}^7] ${message}`);
}

/**
 * @param reference Title for organisation logs
 * @param message Inform message
*/
export function Inform(reference: string, message: string): void {
  console.log(`[^5INFORM^7]\t[^5${reference}^7] ${message}`);
}

/**
 * @param reference Title for organisation logs
 * @param message Warn message
*/
export function Warn(reference: string, message: string): void {
  console.log(`[^3WARNING^7]\t[^3${reference}^7] ${message}`);
}

/**
 * @param reference Title for organisation logs
 * @param message Error message
*/
export function Error(reference: string, message: string): void {
  console.log(`[^8ERROR^7]\t[^8${reference}^7] ${message}`);
}

export function GetHash(hashValue: string | number): string | number {
  if (typeof hashValue == "number") return hashValue;
  if (typeof hashValue == "string") return GetHashKey(hashValue);
}

/**
 * @param c1 First Coord location
 * @param c2 Second Coord location
 * @param useZCoord Whether or not to use the Z coordinate to determine your distance.
 * @returns 
 */
export function Dist(c1: Vector3, c2: Vector3, useZCoord: boolean): number {
  if (useZCoord) {
    const xDist = c1.x - c2.x;
    const yDist = c1.y - c2.y;
    const zDist = c1.z - c1.z;
    return Math.sqrt((xDist * xDist) + (yDist * yDist) + (zDist * zDist));
  } else {
    const xDist = c1.x - c2.x;
    const yDist = c1.y - c2.y;
    return Math.sqrt((xDist * xDist) + (yDist * yDist));
  }
}

export function CreateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
 });
}

export async function GetClosestPlayerPed(position: Vector3): Promise<[Ped, number]> {
  let closestEntity;
  let closestDistance = 1000;
  let justStarted = true;

  for(let a = 0; a < Object.keys(GetActivePlayers).length; a++) {
    const ped = new Ped(GetActivePlayers[a]);
    const pedDist = Dist(position, ped.Position, true);

    if (justStarted) {
      closestEntity = ped;
      closestDistance = pedDist;
      justStarted = false;
    }

    if (closestDistance < pedDist) {
      closestEntity = ped;
      closestDistance = pedDist;
    }

    return [closestEntity, closestDistance];
  }
}

export async function GetClosestPed(position: Vector3): Promise<[Ped, number]> {
  let closestEntity;
  let closestDistance = 1000;
  let justStarted = true;

  for(let a = 0; a < World.getAllPeds.length; a++) {
    const ped = new Ped(World.getAllPeds[a]);
    const pedDist = Dist(position, ped.Position, true);

    if (justStarted) {
      if (!IsPedAPlayer(ped.Handle)) {
        closestEntity = ped;
        closestDistance = pedDist;
        justStarted = false;
      }
    }

    if (closestDistance < pedDist) {
      if (!IsPedAPlayer(ped.Handle)) {
        closestEntity = ped;
        closestDistance = pedDist;
      }
    }

    return [closestEntity, closestDistance];
  }
}

export function Delay(ms : number) : Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function Random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function DisplayHelp(helpMessage: string, beepSound: boolean = false): void {
  BeginTextCommandDisplayHelp('STRING')
	AddTextComponentScaleform(helpMessage)
	EndTextCommandDisplayHelp(0, false, beepSound, -1)
}

// Use https://wiki.rage.mp/index.php?title=Fonts_and_Colors for font examples
export function Draw3DText(position: Vector3, colour: Colour, text: string, font: Font, rescaleUponDistance: boolean = true, textScale: number = 1.0, dropShadow: boolean = false) {
    const camPosition = GetGameplayCamCoord()
    const dist = Dist(new Vector3(camPosition[0], camPosition[1], camPosition[2]), position, true);
    let scale = (1 / dist) * 20;
    const fov = (1 / GetGameplayCamFov()) * 100;
    scale = scale * fov;
    if (rescaleUponDistance) {
      SetTextScale(textScale * scale, textScale * scale);
    } else {
      SetTextScale(textScale, textScale);
    }
    SetTextFont(Number(font));
    SetTextProportional(true);
    SetTextColour(colour.r, colour.g, colour.b, colour.a);
    if (dropShadow)
    {
      SetTextDropshadow(1, 1, 1, 1, 255);
      SetTextDropShadow();
    }
    SetTextOutline();
    SetTextEntry("STRING");
    SetTextCentre(true);
    AddTextComponentString(text);
    SetDrawOrigin(position.x, position.y, position.z, 0);
    DrawText(0, 0);
    ClearDrawOrigin();
}

/**
 * 
 * @param numberData The number array
 * @returns The number array data converted into a Vector3 format
 */
export function NumToVector3(numberData: number[]): Vector3 {
  return new Vector3(numberData[0], numberData[1], numberData[2])
}

// Animations
export async function LoadAnim(animDict: string): Promise<boolean> {
	if (HasAnimDictLoaded(animDict)) {
    return true
  }
	
  RequestAnimDict(animDict);
	const currTime = GetGameTimer();
  let timedOut = false;

  do {
    await Delay(10);
    if ((GetGameTimer() - currTime) >= 5000) {
      Error("LoadAnim", `Timeout requesting anim [${animDict}] failed after 5 seconds!`);
      timedOut = true;
      break;
    }
  } while (!HasAnimDictLoaded(animDict));

  if (timedOut) {
    return false;
  }

	return true
}

export async function PlayAnim(ped: Ped, animDict: string, animName: string, flag: number, duration: number, blendInSpeed: number, blendOutSpeed: number, playbackRate: number, lockX: boolean, lockY: boolean, lockZ: boolean): Promise<boolean> {
	if (!ped.exists) {
    Error("PlayAnim", "The passed ped doesn't exist!");
    return false;
  }

  if (LoadAnim(animDict)) {
		TaskPlayAnim(ped.Handle, animDict, animName, blendInSpeed || 8.0, blendOutSpeed || 8.0, duration || -1, flag || -1, playbackRate || 0, lockX || false, lockY || false, lockZ || false);
		while (!IsEntityPlayingAnim(ped.Handle, animDict, animName, flag || -1)) await Delay(0);
		return true;
  } else {
		return false;
  }
}

export async function closestPed(): Promise<[Ped, number]> {
  let closestPed: Ped;
  let closestDistance = 1000;
  let justStarted = true;
  const worldPeds = World.getAllPeds();
  
  worldPeds.forEach(ped => {
    if (Game.PlayerPed.Handle != ped.Handle) {
      const pedDist = Dist(Game.PlayerPed.Position, ped.Position, true);

      if (justStarted) {
        closestPed = ped;
        closestDistance = pedDist;
        justStarted = false;
      }

      if (pedDist < closestDistance) {
        closestPed = ped;
        closestDistance = pedDist;
      }
    }
  });

  console.log(`Ped: ${closestPed.Handle} | Distance: ${closestDistance}`);
  if (closestDistance <= 10.0) {
    return [closestPed, closestDistance];
  } else {
    Error("(closestPed)", "No ped found!");
    return [null, null];
  }
}

/**
 * 
 * @param callbackName Name of the callback
 * @param callback Function
 */
export function RegisterNuiCallback(callbackName: string, callback: CallableFunction): void {
  RegisterNuiCallbackType(callbackName); // register the type
  on(`__cfx_nui:${callbackName}`, callback);
}
