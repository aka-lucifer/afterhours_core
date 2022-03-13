import { Departments } from "./enums/jobs/departments";
import { PoliceRanks, StateRanks, CountyRanks} from "./enums/jobs/ranks";

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