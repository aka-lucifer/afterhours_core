import { Departments } from "./enums/jobs/departments";
import { PoliceRanks, StateRanks, CountyRanks} from "./enums/jobs/ranks";

/**
 * 
 * @param rank Rank Enum
 * @param department Department Enum
 * @returns Rank string depending on your rank power & department int.
 */
export async function getRankFromValue(rank: PoliceRanks | StateRanks | CountyRanks, department: Departments): Promise<string> {
  let rankString: string;

  if (department == Departments.Police) {
    rankString = PoliceRanks[rank];
    rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
  } else if (department == Departments.State) {
    rankString = StateRanks[rank];
    rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
  } else if (department == Departments.County) {
    rankString = CountyRanks[rank];
    rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
  }

  return rankString
}

/**
 * 
 * @param startPosition The argument to start from
 * @param args // The args to slice
 * @returns // The message content ting!
 */
export function concatArgs(startPosition: number, args: string[]): string {
  const tempString = args.join(" "); // Define the args into a string
  const messageArgs = args[startPosition]; // Get the argument content from the provided position
  const stringThing = messageArgs[0]; // Get the very first char of the first argument
  const result = tempString.indexOf(stringThing); // Get the very first char of the first argument from the join string args into a string.
  
  return args.join(" ").slice(result)
}

export function isDateValid(date: Date): boolean {
  return date.getTime() === date.getTime(); // If the date object is invalid, it will return 'NaN' on getTime() and NaN is never equal to itself.
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

export function formatSQLDate(timestamp: Date): string {
  return `${timestamp.getFullYear()}-${TwoDigits(timestamp.getMonth() + 1)}-${TwoDigits(timestamp.getDate())} ${TwoDigits(timestamp.getHours())}:${TwoDigits(timestamp.getMinutes())}:${TwoDigits(timestamp.getSeconds())}`;
}