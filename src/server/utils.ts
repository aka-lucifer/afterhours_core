import axios, { AxiosError} from "axios";
import {Vector3} from "fivem-js";

import {server} from "./server";
import {LogTypes} from "./enums/logTypes";

import WebhookMessage from "./models/webhook/discord/webhookMessage";
import {StaffLog} from "./models/database/staffLog";

import {EmbedColours} from "../shared/enums/embedColours";
import {Ranks} from "../shared/enums/ranks";
import sharedConfig from "../configs/shared.json";
import serverConfig from "../configs/server.json"
import {Player} from "./models/database/player";
import {StaffLogs} from "./enums/database/staffLogs";
import {ErrorCodes} from "../shared/enums/errors";

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
export function GetHash(hashValue: string): string | number {
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
export async function HexadecimalToDec(hexadecimal: any): Promise<string> {

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
          description: `A player has sent a chat message.\n\n**Command**: ${name}\n**Args**: ${args}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    } else {
      await server.logManager.Send(LogTypes.Chat, new WebhookMessage({
        username: "Chat Logs", embeds: [{
          color: EmbedColours.Green,
          title: "__Chat Command__",
          description: `A player has used a chat command.\n\n**Command**: ${name}\n**Sent By**: ${player.GetName}\n**Rank**: ${Ranks[player.GetRank]}\n**Discord**: ${sendersDisc != "Unknown" ? `<@${sendersDisc}>` : sendersDisc}`,
          footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
        }]
      }));
    }
  }
}

/**
 *
 * @param i Integer to add zero to
 */
export function addZero(i): string {
  if (i < 10) {i = "0" + i}
  return i;
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
export function randomEnum(passedEnums: any): Promise<string | number> {
  const index = Math.floor(Math.random() * Object.keys(passedEnums).length);
  return passedEnums[Object.keys(passedEnums)[index]];
}

/**
 *
 * @param passedEnums Enum to get a randomized entry from
 */
export async function enumMatches(passedEnums: any, enumValue: string | number): Promise<[undefined, boolean]> {
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
