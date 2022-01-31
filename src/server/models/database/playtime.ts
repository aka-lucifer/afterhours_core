import { Times } from "../../enums/database/times";

export class Playtime {
  public days: number;
  public hours: number;
  public minutes: number;

  constructor(seconds: number) {
    this.days = Math.floor(seconds / Times.Days);
    this.hours = Math.floor((seconds / Times.Hours) % 24);
    this.minutes = Math.floor(seconds / Times.Minutes) % Times.Minutes
  }

  // Methods
  public async FormatTime(): Promise<string> {
    return `${this.days}d ${this.hours}h ${this.minutes}m`;
  }
}
