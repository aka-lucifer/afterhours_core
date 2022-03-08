import { PoliceRanks, CountyRanks, StateRanks } from "../../../shared/enums/jobs/ranks"
import { Departments } from "../../../shared/enums/jobs/departments";

export class Job {
  private name: string;
  private label: string;
  private isBoss: boolean;
  private rank: number | PoliceRanks | CountyRanks | StateRanks;
  private callsign: string = "NOT_SET";
  private status: boolean;
  private department: Departments;

  constructor(name: string, label: string, isBoss: boolean, rank: number | PoliceRanks | CountyRanks | StateRanks, callsign: string, status: boolean, department?: Departments) {
    this.name = name;
    this.label = label;
    this.isBoss = isBoss;
    this.rank = rank;
    this.callsign = callsign;
    this.status = status;
    
    if (department !== undefined) {
      this.department = department;
    }
  }
}