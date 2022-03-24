import { PoliceRanks, CountyRanks, StateRanks } from "../../../shared/enums/jobs/ranks"
import { Departments } from "../../../shared/enums/jobs/departments";

export class Job {
  private name: string;
  private label: string;
  private isBoss: boolean;
  private rank: number | PoliceRanks | CountyRanks | StateRanks;
  private rankLabel: string;
  private callsign;
  private status: boolean;
  private department: Departments;

  constructor(name: string, label: string, rank?: number | PoliceRanks | CountyRanks | StateRanks, department?: Departments, isBoss?: boolean, callsign?: string, status?: boolean) {
    this.name = name;
    this.label = label;
    if (rank) this.rank = rank;
    if (department) this.department = department;
    if (isBoss) this.isBoss = isBoss;
    if (callsign) this.callsign = callsign;
    if (status) this.status = status;
  }

  // Getters & Setters 
  public get Status(): boolean {
    return this.status;
  }

  public set Status(newState: boolean) {
    this.status = newState;
  }

  public set RankLabel(newValue: string) {
    this.rankLabel = newValue;
  }
}