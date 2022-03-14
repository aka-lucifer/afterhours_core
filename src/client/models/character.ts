import { Job } from "../../server/models/jobs/job"

export class Character {
  private id: number;
  private firstName: string;
  private lastName: string;
  private nationality: string;
  private backstory: string;
  private dob: Date;
  private age: number;
  private isFemale: boolean;
  private phone: string;
  private job: Job;
  private metadata: Record<string, any> = {};
  private createdAt: Date;
  private lastUpdated: Date;

  constructor(charData: Record<string, any>) {
    this.id = charData.id;
    this.firstName = charData.firstName;
    this.lastName = charData.lastName;
    this.nationality = charData.nationality;
    this.backstory = charData.backstory;
    this.dob = charData.dob;
    this.age = charData.age;
    this.isFemale = charData.isFemale;
    this.phone = charData.phone;
    this.job = charData.job;
    this.metadata = charData.metadata;
    this.createdAt = charData.createdAt;
    this.lastUpdated = charData.createdAt;
  }

  // Get Requests
  public get Name(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get Age(): number {
    return this.age;
  }

  public get Phone(): string {
    return this.phone
  }
}