import { Audio, Font, Game, Model, Ped, RadioStation, RaycastResult, Vector3, Vehicle, VehicleSeat, World } from 'fivem-js';

import { client } from './client';

import { Postal } from './controllers/vehicles/gps';

import { Notification } from './models/ui/notification';

import { Events } from '../shared/enums/events/events';
import { NotificationTypes } from '../shared/enums/ui/notifications/types';
import { RightHandsideVehs } from '../shared/enums/vehicles';
import { VehData } from '../shared/interfaces/vehicle';
import { Weapon } from '../shared/interfaces/weapon';
import { NumToVector3 } from '../shared/utils';

import clientConfig from '../configs/client.json';

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

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function DisplayHelp(helpMessage: string, beepSound: boolean = false): void {
  BeginTextCommandDisplayHelp('STRING')
	AddTextComponentScaleform(helpMessage)
	EndTextCommandDisplayHelp(0, false, beepSound, -1)
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

  if (await LoadAnim(animDict)) {
		TaskPlayAnim(ped.Handle, animDict, animName, blendInSpeed || 8.0, blendOutSpeed || 8.0, duration || -1, flag || -1, playbackRate || 0, lockX || false, lockY || false, lockZ || false);
		while (!IsEntityPlayingAnim(ped.Handle, animDict, animName, 3)) await Delay(0);
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

export function Draw3DText(position: Vector3, colour: { r: number, g: number, b: number, a: number }, text: string, font: Font, rescaleUponDistance: boolean = true, textScale: number = 1.0, dropShadow: boolean = false): void {
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

export async function teleportToCoords(coords: Vector3, fade: boolean = true, heading?: number): Promise<boolean> {
  let success = false;
  client.Teleporting = true;

  // Is player in a vehicle and the driver? Then we'll use that to teleport.
  const [currVeh, inside] = await insideVeh(Game.PlayerPed);
  const restoreVehVisibility = inside && currVeh.IsVisible;
  const restorePedVisibility = Game.PlayerPed.IsVisible;

  // Freeze vehicle or player location and fade out the entity to the network.
  if (inside) {
    currVeh.IsPositionFrozen = true;
    if (currVeh.IsVisible) {
      if (fade) NetworkFadeOutEntity(currVeh.Handle, true, false);
    }
  } else {
    ClearPedTasksImmediately(Game.PlayerPed.Handle);
    Game.PlayerPed.IsPositionFrozen = true;
    if (Game.PlayerPed.IsVisible) {
      if (fade) NetworkFadeOutEntity(Game.PlayerPed.Handle, true, false);
    }
  }

  // Fade out the screen and wait for it to be faded out completely.
  if (fade) {
    DoScreenFadeOut(500);
    while (!IsScreenFadedOut()) {
      await Delay(0);
    }
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
    if (restoreVehVisibility && fade)
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
    if (restorePedVisibility && fade)
    {
      NetworkFadeInEntity(Game.PlayerPed.Handle, true);
    }
    Game.PlayerPed.IsPositionFrozen = false;
  }

  // Set heading if defined
  if (heading !== undefined) Game.PlayerPed.Heading = heading;

  // Fade screen in and reset the camera angle.
  if (fade) DoScreenFadeIn(500);
  SetGameplayCamRelativePitch(0.0, 1.0);
  return success;
}

const seats = [
  -1,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14
]

const seatsList = {
  "-1": "Driver",
  "0": "Passenger",
  "1": "Rear Left",
  "2": "Rear Right", 
  "3": "ExtraSeat1",
  "4": "ExtraSeat2",
  "5": "ExtraSeat3", 
  "6": "ExtraSeat4", 
  "7": "ExtraSeat5", 
  "8": "ExtraSeat6", 
  "9": "ExtraSeat7", 
  "10": "ExtraSeat8", 
  "11": "ExtraSeat9", 
  "12": "ExtraSeat10", 
  "13": "ExtraSeat11", 
  "14": "ExtraSeat12",
  "15": "ExtraSeat13",
  "16": "ExtraSeat14"
}

interface Passenger {
  seat: number,
  playerId: number,
  netId: number
}

/**
 * 
 * @param vehicle Vehicle to return the current passengers
 * @returns The current passengers inside a vehicle, containing the seat label, player & server ID
 */
export async function getVehPassengers(vehicle: Vehicle): Promise<Passenger[]> {
  const passengers: Passenger[] = [];
  const maxSeats = GetVehicleMaxNumberOfPassengers(vehicle.Handle) + 1; // Get all passenger seats, plus driver seat

  // Loop through all seats and all vehicle seats.
  for (let i = 0; i < seats.length && i < maxSeats; i++) {
    const seatFree = vehicle.isSeatFree(seats[i]);
    if (!seatFree) {
      const passenger = vehicle.getPedOnSeat(seats[i]);
      const player = NetworkGetPlayerIndexFromPed(passenger.Handle);

      passengers.push({
        seat: seatsList[seats[i]],
        playerId: player,
        netId: GetPlayerServerId(player)
      })
    }
  }

  return passengers;
}

export function getPedsVehSeat(ped: Ped): VehicleSeat {
  if (IsPedInAnyVehicle(ped.Handle, false)) {
    const currVeh = ped.CurrentVehicle;
    const maxPassengers = GetVehicleMaxNumberOfPassengers(currVeh.Handle);
    for (let i = -2; i < maxPassengers; i++) {
      if (currVeh.getPedOnSeat(i).Handle == ped.Handle) {
        return i;
      }
    }
  }

  return VehicleSeat.None;
}

export function speedToMph(speed: number): number {
  return Math.floor(speed * 2.236936);
}

export async function rightHandVehicle(vehicle: Vehicle): Promise<boolean> {
  const vehIndex = RightHandsideVehs.findIndex(enumVeh => enumVeh === vehicle.DisplayName.toLowerCase());
  return vehIndex !== -1;
}

/**
 * 
 * @param rotation The rotation Vec3 to get the direction of
 * @returns The direction of the specificed rotation, in the worlds 3D space
 */
export function rotationToDirection(rotation: Vector3): Vector3 {
  const adjustedRotation = new Vector3(
    (Math.PI / 180) * rotation.x,
    (Math.PI / 180) * rotation.y,
    (Math.PI / 180) * rotation.z
  );

  const direction = new Vector3(
    -Math.sin(adjustedRotation.z) * Math.abs(Math.cos(adjustedRotation.x)),
    Math.cos(adjustedRotation.z) * Math.abs(Math.cos(adjustedRotation.x)),
    Math.sin(adjustedRotation.x)
  );

  return direction;
}

/**
 * 
 * @param pos The position Vec3 from where to start from
 * @param ped The ped from what to start from
 * @param distance The distance to shoot the raycast (Default - 15000)
 * @returns 
 */
export function screenToWorld(pos: Vector3, ped: Ped, distance: number = 15000): [boolean, Vector3] {
  const camRot = NumToVector3(GetGameplayCamRot(2));
  const direction = rotationToDirection(camRot);
  const destination = new Vector3(
    pos.x + direction.x * distance,
    pos.y + direction.y * distance,
    pos.z + direction.z * distance,
  );

  const result = new RaycastResult(StartShapeTestRay(pos.x, pos.y, pos.z, destination.x, destination.y, destination.z, -1, ped.Handle, 1));
  return [result.DidHit, result.HitPosition];
}

/**
 * 
 * @param ped The ped to get the location of.
 * @returns Return the street, crossing and postal of the passed ped.
 */
export async function getLocation(ped: Ped): Promise<[string, string, Postal]> {
  const pedPos = ped.Position;
  const [streetHash, crossingHash] = GetStreetNameAtCoord(pedPos.x, pedPos.y, pedPos.z);
  const street = GetStreetNameFromHashKey(streetHash);
  const crossing = GetStreetNameFromHashKey(crossingHash);
  const postal = await client.vehicleManager.gps.getNearestPostal(ped);
  return [street, crossing, postal];
}

/**
 * 
 * @param ped The ped to get the current zone.
 * @returns Returns the current zone of the passed ped.
 */
export async function getZone(ped: Ped): Promise<string> {
  if (ped.exists()) {
    const zone = GetNameOfZone(ped.Position.x, ped.Position.y, ped.Position.z);
    const matchedZone = clientConfig.world.zones[zone];
    if (matchedZone === undefined) {
      return "Zone N/A";
    } else {
      return matchedZone;
    }
  } else {
    return "Zone N/A";
  }
}

const directions = [
  { direction: 0, type: "North"},
  { direction: 45, type: "North West"},
  { direction: 90, type: "West"},
  { direction: 135, type: "South West"},
  { direction: 180, type: "South"},
  { direction: 225, type: "North South"},
  { direction: 270, type: "East"},
  { direction: 315, type: "North East"},
  { direction: 360, type: "North"},
]

/**
 * @param ped The ped to get the current direction of.
 * @returns Returns the current direction of the passed ped.
 */
export async function getDirection(ped: Ped): Promise<string> {
  for (let i = 0; i < directions.length; i++) {
    const myDirection = ped.Heading;

    if (Math.abs(myDirection - directions[i].direction) < 22.5) {
      return directions[i].type;
    }
  }
}

/**
 *
 * @param model The model name or model hash of the vehicle to create
 * @param position The world position to create the vehicle at
 * @param heading The entity heading to make the entity face
 * @param plate A custom plate to assign to the vehicle
 * @returns Returns the vehicle class of the vehicle created
 */
export async function createVeh(model: string | number, position: Vector3, heading?: number, plate?: string): Promise<Vehicle> {
  const vehModel = new Model(model);

  if (vehModel.IsInCdImage) {
    const loadedModel = vehModel.request(2000);
    if (loadedModel) {
      const vehicle = await World.createVehicle(vehModel, position, heading);

      if (vehicle.Handle !== undefined) {
        // Vehicle Setters
        if (plate !== undefined) vehicle.NumberPlate = plate;
        vehicle.PreviouslyOwnedByPlayer = true; // Set that a player owns the vehicle
        vehicle.NeedsToBeHotwired = false; // Set it already hotwired
        vehicle.RadioStation = RadioStation.RadioOff; // Set the vehicle radio turned off
        vehicle.DirtLevel = 0.0;
        vehicle.FuelLevel = 100;
        DecorSetFloat(vehicle.Handle, "AH_FUEL_LEVEL", vehicle.FuelLevel)
        vehModel.markAsNoLongerNeeded(); // Removes vehicle model from memory
      }

      return vehicle;
    }
  } else {
    const notify = new Notification("Vehicle", `The passed vehicle model (${model}) doesn't exist in the server!`, NotificationTypes.Error);
    await notify.send();
  }
}

export async function getClosestVehicle(ped: Ped): Promise<[number, Vehicle]> {
  const pedPos = ped.Position;
  const worldVehs = World.getAllVehicles();
  let closest;
  let distance;

  for (let i = 0; i < worldVehs.length; i++) {
    const dist = pedPos.distance(worldVehs[i].Position);

    if (closest == undefined || dist < distance) {
      closest = worldVehs[i];
      distance = dist;
    }
  }

  return [distance, closest];
}

/**
 * 
 * @param vehicles The vehicle array/object from the JSON to sort
 * @returns A sorted array of the vehicles information
 */
 export async function sortVehicles(vehicles: Record<string, any>): Promise<VehData[]> {
  let vehs: VehData[] = [];
  for (const [_, vehData] of Object.entries(vehicles)) {
    const vehicle = vehData as VehData;
    vehs.push(vehicle);
  }

  vehs = vehs.sort(function(a, b) {
    const textA = a.brand.toUpperCase();
    const textB = b.brand.toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });

  return vehs;
}

/**
 * 
 * @param weapons The weapon array/object from the JSON to sort
 * @returns A sorted array of the weapon information
 */
 export async function sortWeapons(weapons: Record<string, any>): Promise<Weapon[]> {
  const weaps: Weapon[] = [];
  
  for (const [_, weapData] of Object.entries(weapons)) {
    const weapon = weapData as Weapon;
    weaps.push(weapon);
  }

  return weaps;
}

export function getOffsetFromEntityInWorldCoords(entity: number, offset: Vector3): Vector3 {
  const position = NumToVector3(GetEntityCoords(entity, false));
  const rotation = NumToVector3(GetEntityRotation(entity, 0));

  const rX = degreesToRadians(rotation.x);
  const rY = degreesToRadians(rotation.y);
  const rZ = degreesToRadians(rotation.z);
  const cosRx = Math.cos(rX);
  const cosRy = Math.cos(rY);
  const cosRz = Math.cos(rZ);
  const sinRx = Math.sin(rX);
  const sinRy = Math.sin(rY);
  const sinRz = Math.sin(rZ);

  const M11 = (cosRz * cosRy) - (sinRz * sinRx * sinRy);
  const M12 = (cosRy * sinRz) + (cosRz * sinRx * sinRy);
  const M13 = -cosRx * sinRy;

  const M21 = -cosRx * sinRz;
  const M22 = cosRz * cosRx;
  const M23 = sinRx;

  const M31 = (cosRz * sinRy) + (cosRy * sinRz * sinRx);
  const M32 = (sinRz * sinRy) - (cosRz * cosRy * sinRx);
  const M33 = cosRx * cosRy;

  const matrix4 = new Vector3(position.x, position.y, position.z - 1.0);

  return new Vector3(
    (offset.x * M11) + (offset.y * M21) + (offset.z * M31) + matrix4.x,
    (offset.x * M12) + (offset.y * M22) + (offset.z * M32) + matrix4.y,
    (offset.x * M13) + (offset.y * M23) + (offset.z * M33) + matrix4.z
  );
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

export function eulerToMatrix(rotation: Vector3): [Vector3, Vector3, Vector3] {
  const radX = radiansToDegrees(rotation.x);
  const radY = radiansToDegrees(rotation.y);
  const radZ = radiansToDegrees(rotation.z);

  const sinX = Math.sin(radX);
  const sinY = Math.sin(radY);
  const sinZ = Math.sin(radZ);
  const cosX = Math.cos(radX);
  const cosY = Math.cos(radY);
  const cosZ = Math.cos(radZ);

  const vecX = new Vector3(cosY * cosZ, cosY * sinZ, -sinY);
  const vecY = new Vector3(
    cosZ * sinX * sinY - cosX * sinZ,
    cosX * cosZ - sinX * sinY * sinZ,
    cosY * sinX
  );
  const vecZ = new Vector3(
    -cosX * cosZ * sinY + sinX * sinZ,
    -cosZ * sinX + cosX * sinY * sinZ,
    cosX * cosY
  );

  return [vecX, vecY, vecZ];
}

// EVENTS
onNet(Events.soundFrontEnd, (sound: string, set?: string) => {
  Audio.playSoundFrontEnd(sound, set);
});

onNet(Events.showLoading, (loadingText: string) => {
  BeginTextCommandBusyspinnerOn("STRING");
  AddTextComponentSubstringPlayerName(loadingText);
  EndTextCommandBusyspinnerOn(3);
});

onNet(Events.stopLoading, () => {
  BusyspinnerOff();
});
