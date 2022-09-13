import { PoliceRanks, StateRanks, CountyRanks} from "./enums/jobs/ranks";
import { Jobs } from "./enums/jobs/jobs";
import { Vector3 } from "fivem-js";
/**
 * 
 * @param rank Rank Enum
 * @param department Department Enum
 * @returns Rank string depending on your rank power & department int.
 */
export async function getRankFromValue(rank: PoliceRanks | StateRanks | CountyRanks, job: Jobs | string): Promise<string> {
  let rankString: string;

  if (job == Jobs.Police) {
    rankString = PoliceRanks[rank];
    
    const rankLabelSplit = splitCapitalsString(rankString);
    const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

    rankString = formattedRankLabel;
    // rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
  } else if (job == Jobs.State) {
    rankString = StateRanks[rank];
    
    const rankLabelSplit = splitCapitalsString(rankString);
    const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

    rankString = formattedRankLabel;
    // rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
  } else if (job == Jobs.County) {
    rankString = CountyRanks[rank];
    
    const rankLabelSplit = splitCapitalsString(rankString);
    const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

    rankString = formattedRankLabel;
    // rankString = rankString.replace("_", " "); // Replace _ symbol with a space, so it's properly formatted for UI
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
  if (args.length > 1) { // If more than one array entry
    args.splice(0, startPosition);
    return args.join(" ");
  } else { // If just one word
    return args[startPosition];
  }
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

/**
 * 
 * @param name First name to convert to first char and full stop.
 * @returns Name -> N.
 */
export function formatFirstName(name: string): string {
  return name.slice(0, name.indexOf(name[1])); // Converts first name, to first letter (Lucy -> L)
}

/**
 * 
 * @param toUpdate The string to convert into a string array
 * @returns Takes a string with multiple uppercase sections in one `word` e.g. rank term or vehicle colour (SeniorAdmin | MetallicBlack)
 */
export function splitCapitalsString(toUpdate: string): string[] {
  return toUpdate.match(/[A-Z][a-z]+/g);
}

/**
 * 
 * @param toFormat The string array to return into a formatted string
 * @returns Take each entry in the split string array and formats it neatly into a new string
 */
export function formatSplitCapitalString(toFormat: string[]): string {
  let newString = "";
  if (toFormat.length > 1) { // If more than one word e.g. (Admin)
    for (let a = 0; a < toFormat.length; a++) {
      newString = `${newString} ${toFormat[a]}`; 
    }
  } else {
    newString = toFormat[0]; // Only one entry so just use that
  }

  return newString;
}

export function formatRank(rankString: string): string {
  const rankLabelSplit = splitCapitalsString(rankString);
  const formattedRankLabel = formatSplitCapitalString(rankLabelSplit);

  return formattedRankLabel;
}

/**
 *
 * @param i Integer to add zero to
 */
 export function addZero(i: number): string {
  let newValue = i.toString();
  if (i < 10) newValue = "0" + i;

  return newValue;
}

/**
 * 
 * @param numberData The number array
 * @returns: The number array data converted into a Vector3 format
 */
 export function NumToVector3(numberData: number[]): Vector3 {
  return new Vector3(numberData[0], numberData[1], numberData[2])
}
