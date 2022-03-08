import { Player } from "./player";

import { Job } from "../jobs/job";

import * as Database from "../../managers/database/database"
import { Departments } from "../../../shared/enums/jobs/departments";
import { PoliceRanks } from "../../../shared/enums/jobs/ranks";
import { Gender } from "../../../shared/enums/characters";

export class Character {
  private id: number;
  private playerId: number;
  private owner: Player;
  private firstName: string;
  private lastName: string;
  private nationality: string;
  private backstory: string;
  private dob: string;
  private age: number;
  private isFemale: boolean;
  private phone: string;
  private job: Job;
  private createdAt: Date;
  private lastUpdated: Date;

  constructor(playerId: number) {
    this.playerId = playerId;
  }

  // Get & Set Requests
  public get Id(): number {
    return this.id;
  }

  public get Owner(): Player {
    return this.owner;
  }
  
  public set Owner(newOwner: Player) {
    this.owner = newOwner;
  }

  public get Name(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get Nationality(): string {
    return this.nationality;
  }

  public get Age(): number {
    return this.age;
  }

  public get Gender(): string {
    let value;

    if (!this.isFemale) {
      value = 0;
    } else {
      value = 1;
    }

    return Gender[value];
  }

  public get Phone(): string {
    return this.phone
  }

  public get Job(): Job {
    return this.job;
  }

  public get CreatedAt(): string {
    return this.createdAt.toUTCString();
  }

  public get LastEdited(): string {
    return this.lastUpdated.toUTCString();
  }

  // Methods
  public async load(id: number): Promise<boolean> {
    const charData = await Database.SendQuery("SELECT * FROM `player_characters` WHERE `id` = :id AND `player_id` = :playerId LIMIT 1", {
      id: id,
      playerId: this.playerId
    });

    if (charData.data.length > 0) {
      this.id = charData.data[0].id;
      this.firstName = charData.data[0].first_name;
      this.lastName = charData.data[0].last_name;
      this.nationality = charData.data[0].nationality;
      this.backstory = charData.data[0].backstory;
      this.dob = charData.data[0].dob;
      this.age = this.formatAge(this.dob);
      this.isFemale = (charData.data[0].gender == 1);
      this.phone = this.formatPhone(charData.data[0].phone);

      const jobData = JSON.parse(charData.data[0].job);
      this.job = new Job(jobData.name, jobData.label, jobData.isBoss, jobData.rank, jobData.callsign, jobData.status, jobData.department);
      // console.log("Rank", PoliceRanks[jobData.rank]);
      this.createdAt = new Date(charData.data[0].created_at);
      this.lastUpdated = new Date(charData.data[0].last_updated);
      return true;
    } else {
      return false;
    }
  }

  public async format(character?: CharInfo): Promise<boolean> {
    this.id = character?.id;
    this.firstName = character?.firstName;
    this.lastName = character?.lastName;
    this.nationality = character?.nationality;
    this.backstory = character?.backstory;
    this.dob = character?.dob;
    this.age = this.formatAge(character?.dob);
    this.isFemale = character?.isFemale;
    this.phone = this.formatPhone(character?.phone);
    this.job = character?.job;
    this.createdAt = new Date(character?.createdAt);
    this.lastUpdated = new Date(character?.lastUpdated);
    return true;
  }

  // Formatters
  private formatAge(dob): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age = age - 1;
    }
    return age;
  }

  private formatPhone(phoneNumber: string): string {
    if (phoneNumber.length === 10) {
      return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, "($1)-$2-$3");
    } else if (phoneNumber.length < 10) {
      return 'was not supplied enough numbers please pass a 10 digit number'
    } else if (phoneNumber.length > 10) {
      return 'was supplied too many numbers please pass a 10 digit number'
    } else {
      return 'something went wrong'
    }
  }
}

interface CharInfo {
  id: number;
  firstName: string;
  lastName: string;
  nationality: string;
  backstory: string;
  dob: string;
  age?: number;
  isFemale: boolean;
  phone?: string;
  job: Job;
  createdAt: Date;
  lastUpdated: Date;
}