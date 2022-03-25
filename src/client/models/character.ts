import { Job } from "../../server/models/jobs/job"
import { Jobs } from "../../shared/enums/jobs/jobs";

export class Character {
  public id: number;
  public firstName: string;
  public lastName: string;
  public nationality: string;
  public backstory: string;
  public dob: Date;
  public age: number;
  public isFemale: boolean;
  public phone: string;
  public job: Job;
  public metadata: Record<string, any> = {};
  public createdAt: Date;
  public lastUpdated: Date;

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

  public get Job(): Job {
    return this.job;
  }

  // Methods
  public isLeoJob(): boolean {
    return this.job.name == Jobs.State || this.job.name == Jobs.County || this.job.name == Jobs.Police
  }
}