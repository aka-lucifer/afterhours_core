import axios from "axios";
import {Vector3, Vehicle, World} from "fivem-js";

import {server} from "./server";
import {LogTypes} from "./enums/logging";

import WebhookMessage from "./models/webhook/discord/webhookMessage";
import {StaffLog} from "./models/database/staffLog";

import {EmbedColours} from "../shared/enums/logging/embedColours";
import {Ranks} from "../shared/enums/ranks";
import sharedConfig from "../configs/shared.json";
import serverConfig from "../configs/server.json"
import {Player} from "./models/database/player";
import {StaffLogs} from "./enums/database/staffLogs";
import {ErrorCodes} from "../shared/enums/logging/errors";

/**
 * @param reference Title for organisation logs
 * @param message Log message
*/
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

/**
 *
 * @param hashValue A string to convert to a hash
 * @returns: A converted string into a hash format
 */
export function GetHash(hashValue: string | number): string | number {
  if (typeof hashValue == "number") return hashValue;
  if (typeof hashValue == "string") return GetHashKey(hashValue);
}

/**
 * @param c1 First Coord location
 * @param c2 Second Coord location
 * @param useZCoord Whether or not to use the Z coordinate to determine your distance (2D - false | 3D - true).
 * @returns: The distance between the two provided locations, either in 2D or 3D.
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

/**
 * 
 * @returns The current date in a MySQL Timestamp format.
 */
export async function GetTimestamp(): Promise<string> {
  const currDate = new Date();
  const dates = [currDate.getFullYear(), TwoDigits(currDate.getMonth() + 1), TwoDigits(currDate.getDate()), TwoDigits(currDate.getHours()), TwoDigits(currDate.getMinutes()), TwoDigits(currDate.getSeconds())];
  return `${dates[0]}-${dates[1]}-${dates[2]} ${dates[3]}:${dates[4]}:${dates[5]}`;
}

function TwoDigits(d) {
  if(0 <= d && d < 10) return "0" + d.toString();
  if(-10 < d && d < 0) return "-0" + (-1*d).toString();
  return d.toString();
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
 * @param ms The amount of time in milliseconds
 * @returns: Makes the program sleep for a provided amount of milliseconds
 */
export function Delay(ms : number) : Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
/**
 *
 * @param min The minimum number to start at
 * @param max The maximum number to start at
 * @returns: A random number between the minimum and maximum number
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 
 * @param numberData The number array
 * @returns: The number array data converted into a Vector3 format
 */
export function NumToVector3(numberData: number[]): Vector3 {
  return new Vector3(numberData[0], numberData[1], numberData[2])
}

/**
 *
 * @param hexadecimal The hexadecimal string to convert to decimal
 * @returns: Converted the provided hexadecimal to a decimal
 */
export async function HexadecimalToDec(hexadecimal: string): Promise<string> {

  function add(x, y) {
    let c = 0;
    const r = [];
    x = x.split('').map(Number);
    y = y.split('').map(Number);
    while(x.length || y.length) {
      const s = (x.pop() || 0) + (y.pop() || 0) + c;
      r.unshift(s < 10 ? s : s - 10);
      c = s < 10 ? 0 : 1;
    }
    if(c) r.unshift(c);
    return r.join('');
  }
  
  let dec = '0';
  hexadecimal.split('').forEach(function(chr) {
    const n = parseInt(chr, 16);
    for(let t = 8; t; t >>= 1) {
      dec = add(dec, dec);
      if(n & t) dec = add(dec, '1');
    }
  });

  return dec;
}

/**
 *
 * @param name The name of the command
 * @param player The player who sent the command
 * @param args Command args or message from the string
 * @returns: Logs the used command to the chat log webhook
 */
export async function logCommand(name: string, player: Player, args?: string): Promise<void> {
  const sendersDisc = await player.GetIdentifier("discord");
  const staffLog = new StaffLog(player.id, StaffLogs.Chat, `Used a chat command (${name})`);
  const savedLog = await staffLog.save();
  if (savedLog) {
    server.staffLogManager.Add(staffLog);
    if (args) {
      await server.logManager.Send(LogTypes.Chat, new WebhookMessage({
        username: "Chat Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Chat Command__",
          description: `A player has sent a chat message.\n\n**Command**: ${name}\n**Args**: ${args}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    } else {
      await server.logManager.Send(LogTypes.Chat, new WebhookMessage({
        username: "Chat Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Chat Command__",
          description: `A player has used a chat command.\n\n**Command**: ${name}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    }
  }
}

/**
 *
 * @param player Player to check if they are in the servers discord or not
 */
export async function inDiscord(player: Player): Promise<boolean> {
  const svGuild = serverConfig.discordLogs.axiosData.guildId;
  const myDiscord = await player.GetIdentifier("discord");

  try {
    const result = await axios.get(`https://discord.com/api/v8/guilds/${svGuild}/members/${myDiscord}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${serverConfig.discordLogs.axiosData.botToken}`
      }
    });

    if (result.data) return true;
  } catch (error) {
    Error("(inDiscord) Utils Method", `[${player.Id}] - ${player.GetName} | Error Code: ${ErrorCodes.NotInDiscord}`);
    return false;
  }
}

/**
 *
 * @param passedEnums Enum to get a randomized entry from
 */
export function randomEnum(passedEnums: Record<string, any>): Promise<string | number> {
  const index = Math.floor(Math.random() * Object.keys(passedEnums).length);
  return passedEnums[Object.keys(passedEnums)[index]];
}

/**
 *
 * @param passedEnums Enum to get a randomized entry from
 */
export async function enumMatches(passedEnums: Record<string, any>, enumValue: string | number): Promise<[undefined, boolean]> {
  let value;
  let matches = false;
  const enumArray = Object.keys(passedEnums);

  for (let i = 0; i < enumArray.length; i++) {
    if (passedEnums[enumArray[i]] == enumValue) {
      value = enumArray[i];
      matches = true;
      break;
    }
  }

  return [value, matches];
}

export async function getClosestPlayer(myPlayer: Player): Promise<[Player, number]> {
  let closestPlayer;
  let closestDistance = 1000;
  
  const svPlayers = server.connectedPlayerManager.GetPlayers;
  for (let i = 0; i < svPlayers.length; i++) {
    const player = svPlayers[i];

    if (myPlayer.Handle !== player.Handle) {
      const dist = myPlayer.Position.distance(player.Position);

      if (closestPlayer == undefined || dist < closestDistance) {
        closestPlayer = player;
        closestDistance = dist;
      }
    }
  }

  return [closestPlayer, closestDistance];
}

export function getOffsetFromEntityInWorldCoords(entity: number, offset: Vector3): Vector3 {
  const position = NumToVector3(GetEntityCoords(entity));
  const rotation = NumToVector3(GetEntityRotation(entity));

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

/**
 * 
 * @returns Returns all known server vehicles in a vehicle class array
 */
export async function getWorldVehicles(): Promise<Vehicle[]> {
  const vehicles = GetAllVehicles();
  const worldVehicles = [];

  for (let i = 0; i < vehicles.length; i++) {
    const vehicle = new Vehicle(vehicles[i]);
    worldVehicles.push(vehicle);
  }

  return worldVehicles;
}

/**
 * 
 * @param player The player to get the nearest vehicle & distance to.
 * @returns A closest vehicle variable and the distance to the vehicle in a decimal.
 */
export async function getClosestVehicle(player: Player): Promise<[Vehicle, number]> {
  let closestVehicle;
  let closestDistance = 1000;
  
  const worldVehicles = await getWorldVehicles();
  for (let i = 0; i < worldVehicles.length; i++) {
    const vehicle = worldVehicles[i];

    const dist = player.Position.distance(vehicle.Position);

    if (closestVehicle == undefined || dist < closestDistance) {
      closestVehicle = vehicle;
      closestDistance = dist;
    }
  }

  return [closestVehicle, closestDistance];
}