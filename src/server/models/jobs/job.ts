import { UnitStatus } from '../../controllers/ui/priority';

import { CountyRanks, PoliceRanks, StateRanks } from '../../../shared/enums/jobs/ranks';

export class Job {
  public name: string;
  public label: string;
  public isBoss: boolean;
  public rank: number | PoliceRanks | CountyRanks | StateRanks;
  public rankLabel: string;
  public callsign: string;
  public status: boolean;
  public statusTime: string;
  private active: UnitStatus = UnitStatus.Busy;

  constructor(name: string, label: string, rank?: number | PoliceRanks | CountyRanks | StateRanks, isBoss?: boolean, callsign?: string, status?: boolean) {
    this.name = name;
    this.label = label;
    if (rank !== undefined) this.rank = rank;
    if (isBoss !== undefined) this.isBoss = isBoss;
    if (callsign !== undefined) this.callsign = callsign;
    if (status !== undefined) this.status = status;
  }

  // Getters & Setters
  public get Callsign(): string {
    return this.callsign;
  }

  public set Callsign(newCallsign: string) {
    this.callsign = newCallsign;
  }

  public get Status(): boolean {
    return this.status;
  }

  public set Status(newState: boolean) {
    this.status = newState;
  }

  public get Active(): UnitStatus {
    return this.active;
  }

  public set Active(newState: UnitStatus) {
    this.active = newState;
  }

  public set RankLabel(newValue: string) {
    this.rankLabel = newValue;
  }

  public get Boss(): boolean {
    return this.isBoss;
  }
}
