import { client } from "./client";
import { Vector3, Ped, World, Font, Game, Vehicle } from "fivem-js";

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

export function Draw3DText(position: Vector3, colour: { r: number, g: number, b: number, a: number }, text: string, font: Font, rescaleUponDistance: boolean = true, textScale: number = 1.0, dropShadow: boolean = false) {
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

export async function insideVeh(ped: Ped): Promise<[Vehicle, boolean]> {
  const currVehicle = ped.CurrentVehicle;
  const inside = currVehicle != null && currVehicle.exists();
  return [currVehicle, inside];
}

/**
 *
 * @param content The string to capitalize
 * @returns: Capitalizes the first letter of the provided strings
 */
 export function Capitalize(content: string): string {
  if (typeof content !== 'string') return ''
  return content.charAt(0).toUpperCase() + content.slice(1)
}

/**
 * 
 * @param textEntry The placeholder of the input
 * @param maxStringLength The character limit of the input
 * @returns 
 */
export async function keyboardInput(textEntry: string, maxStringLength: number): Promise<string> {
	AddTextEntry("FMMC_KEY_TIP1", textEntry)
	DisplayOnscreenKeyboard(1, "FMMC_KEY_TIP1", "", "", "", "", "", maxStringLength)
	client.UsingKeyboard = true

	while (UpdateOnscreenKeyboard() != 1 && UpdateOnscreenKeyboard() != 2) {
		await Delay(0)
  }
		
	if (UpdateOnscreenKeyboard() != 2) {
		const keyboardResult = GetOnscreenKeyboardResult()
		await Delay(500)
		client.UsingKeyboard = false
		return keyboardResult
  } else {
		await Delay(500)
		client.UsingKeyboard = false
		return null
  }
}



export async function teleportToCoords(coords: Vector3, heading?: number): Promise<boolean> {
  let success = false;

  // Is player in a vehicle and the driver? Then we'll use that to teleport.
  const [currVeh, inside] = await insideVeh(Game.PlayerPed);
  const restoreVehVisibility = inside && currVeh.IsVisible;
  const restorePedVisibility = Game.PlayerPed.IsVisible;

  // Freeze vehicle or player location and fade out the entity to the network.
  if (inside) {
    currVeh.IsPositionFrozen = true;
    if (currVeh.IsVisible) {
      NetworkFadeOutEntity(currVeh.Handle, true, false);
    }
  } else {
    ClearPedTasksImmediately(Game.PlayerPed.Handle);
    Game.PlayerPed.IsPositionFrozen = true;
    if (Game.PlayerPed.IsVisible) {
      NetworkFadeOutEntity(Game.PlayerPed.Handle, true, false);
    }
  }

  // Fade out the screen and wait for it to be faded out completely.
  DoScreenFadeOut(500);
  while (!IsScreenFadedOut())
  {
    await Delay(0);
  }

  // This will be used to get the return value from the groundz native.
  let groundZ = 850.0;

  // Bool used to determine if the groundz coord could be found.
  let found = false;

  // Loop from 950 to 0 for the ground z coord, and take away 25 each time.
  for (let zz = 950.0; zz >= 0.0; zz -= 25.0) {
    let z = zz;
    // The z coord is alternating between a very high number, and a very low one.
    // This way no matter the location, the actual ground z coord will always be found the fastest.
    // If going from top > bottom then it could take a long time to reach the bottom. And vice versa.
    // By alternating top/bottom each iteration, we minimize the time on average for ANY location on the map.
    if (zz % 2 != 0) {
      z = 950.0 - zz;
    }

    // Request collision at the coord. I've never actually seen this do anything useful, but everyone keeps telling me this is needed.
    // It doesn't matter to get the ground z coord, and neither does it actually prevent entities from falling through the map, nor does
    // it seem to load the world ANY faster than without, but whatever.
    RequestCollisionAtCoord(coords.x, coords.y, z);

    // Request a new scene. This will trigger the world to be loaded around that area.
    NewLoadSceneStart(coords.x, coords.y, z, coords.x, coords.y, z, 50.0, 0);

    // Timer to make sure things don't get out of hand (player having to wait forever to get teleported if something fails).
    let tempTimer = GetGameTimer();

    // Wait for the new scene to be loaded.
    while (IsNetworkLoadingScene())
    {
      // If this takes longer than 1 second, just abort. It's not worth waiting that long.
      if (GetGameTimer() - tempTimer > 1000)
      {
        Inform("TeleportToCoords Method", "Waiting for the scene to load is taking too long (more than 1s). Breaking from wait loop.");
        break;
      }

      await Delay(0);
    }

    // If the player is in a vehicle, teleport the vehicle to this new position.
    if (inside) {
      SetEntityCoords(currVeh.Handle, coords.x, coords.y, z, false, false, false, true);
    }
    // otherwise, teleport the player to this new position.
    else {
      SetEntityCoords(Game.PlayerPed.Handle, coords.x, coords.y, z, false, false, false, true);
    }

    // Reset the timer.
    tempTimer = GetGameTimer();

    // Wait for the collision to be loaded around the entity in this new location.
    while (!HasCollisionLoadedAroundEntity(Game.PlayerPed.Handle))
    {
      // If this takes too long, then just abort, it's not worth waiting that long since we haven't found the real ground coord yet anyway.
      if (GetGameTimer() - tempTimer > 1000)
      {
        Inform("TeleportToCoords Method", "Waiting for the collision is taking too long (more than 1s). Breaking from wait loop.");
        break;
      }

      await Delay(0);
    }

    // Check for a ground z coord.
    [found, groundZ] = GetGroundZFor_3dCoord(coords.x, coords.y, z, false);

    // If we found a ground z coord, then teleport the player (or their vehicle) to that new location and break from the loop.
    if (found)
    {
      Inform("TeleportToCoords Method", `Ground coordinate found: ${groundZ}`);
      if (inside) {
        SetEntityCoords(currVeh.Handle, coords.x, coords.y, groundZ, false, false, false, true);

        // We need to unfreeze the vehicle because sometimes having it frozen doesn't place the vehicle on the ground properly.
        currVeh.IsPositionFrozen = false;
        currVeh.placeOnGround();
        // Re-freeze until screen is faded in again.
        currVeh.IsPositionFrozen = true;
        success = true;
      }
      else {
        SetEntityCoords(Game.PlayerPed.Handle, coords.x, coords.y, groundZ, false, false, false, true);
        success = true;
      }

      break;
    }

    // Wait 10ms before trying the next location.
    await Delay(10);
  }

  // If the loop ends but the ground z coord has not been found yet, then get the nearest vehicle node as a fail-safe coord.
  if (!found)
  {
    const safePos = coords;
    GetNthClosestVehicleNode(coords.x, coords.y, coords.z, 0, 0, 0, 0);

    // Notify the user that the ground z coord couldn't be found, so we will place them on a nearby road instead.
    Log("TeleportToCoords Method", "Could not find a safe ground coord. Placing you on the nearest road instead.");

    // Teleport vehicle, or player.
    if (inside) {
      SetEntityCoords(currVeh.Handle, safePos.x, safePos.y, safePos.z, false, false, false, true);
      currVeh.IsPositionFrozen = false;
      currVeh.placeOnGround();
      currVeh.IsPositionFrozen = true;
      success = true;
    }
    else {
      SetEntityCoords(Game.PlayerPed.Handle, safePos.x, safePos.y, safePos.z, false, false, false, true);
      success = true;
    }
  }

  // Once the teleporting is done, unfreeze vehicle or player and fade them back in.
  if (inside) {
    if (restoreVehVisibility)
    {
      NetworkFadeInEntity(currVeh.Handle, true);
      if (!restorePedVisibility)
      {
        Game.PlayerPed.IsVisible = false;
      }
    }
    currVeh.IsPositionFrozen = false;
  }
  else {
    if (restorePedVisibility)
    {
      NetworkFadeInEntity(Game.PlayerPed.Handle, true);
    }
    Game.PlayerPed.IsPositionFrozen = false;
  }

  // Fade screen in and reset the camera angle.
  DoScreenFadeIn(500);
  SetGameplayCamRelativePitch(0.0, 1.0);
  return success;
}