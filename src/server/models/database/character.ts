import { Player } from "./player";

import { Job } from "../jobs/job";

import * as Database from "../../managers/database/database"
import { Departments } from "../../../shared/enums/jobs/departments";
import { PoliceRanks } from "../../../shared/enums/jobs/ranks";
import { Bloodtypes, Gender } from "../../../shared/enums/characters";
import { Delay, randomBetween, randomEnum } from "../../utils";

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
  private metadata: Metadata;
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

  public get Metadata(): Metadata {
    return this.metadata;
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
      const jobData = JSON.parse(charData.data[0].job);
      const metaData = JSON.parse(charData.data[0].metadata);

      this.id = charData.data[0].id;
      this.firstName = charData.data[0].first_name;
      this.lastName = charData.data[0].last_name;
      this.nationality = charData.data[0].nationality;
      this.backstory = charData.data[0].backstory;
      this.dob = charData.data[0].dob;
      this.age = this.formatAge(this.dob);
      this.isFemale = (charData.data[0].gender == 1);
      this.phone = this.formatPhone(charData.data[0].phone);
      this.job = new Job(jobData.name, jobData.label, jobData.rank, jobData.department, jobData.isBoss, jobData.callsign, jobData.status);
      this.metadata = new Metadata(metaData.fingerprint, metaData.bloodtype, metaData.isDead, metaData.isCuffed, metaData.licenses, metaData.mugshot, metaData.jailData, metaData.criminalRecord);
      this.createdAt = new Date(charData.data[0].created_at);
      this.lastUpdated = new Date(charData.data[0].last_updated);
      return true;
    } else {
      return false;
    }
  }

  public async create(firstName: string, lastName: string, nationality: string, backstory: string, dob: string): Promise<boolean> {
    this.firstName = firstName;
    this.lastName = lastName;
    this.nationality = nationality;
    this.backstory = backstory;
    this.dob = dob;
    this.age = this.formatAge(this.dob);
    this.phone = await this.generatePhone();
    this.job = new Job("civilian", "Civilian");
    this.metadata = new Metadata();
    await this.metadata.getMetadata();
    
    const newChar = await Database.SendQuery("INSERT INTO `player_characters` (`player_id`, `first_name`, `last_name`, `nationality`, `backstory`, `dob`, `gender`, `phone`, `job`, `metadata`) VALUES (:playerId, :firstName, :lastName, :nationality, :backstory, :dob, :gender, :phone, :job, :metadata)", {
      playerId: this.playerId,
      firstName: this.firstName,
      lastName: this.lastName,
      nationality: this.nationality,
      backstory: this.backstory,
      dob: this.dob,
      gender: this.isFemale ? 1 : 0,
      phone: this.phone,
      job: JSON.stringify(this.job),
      metadata: JSON.stringify(this.metadata)
    });
    
    console.log("NEW CHAR QUERY", newChar);
    if (newChar.meta.affectedRows > 0) {
      this.id = newChar.meta.insertId;
      return true;
    } else {
      return false;
    }
  }

  public async format(character?: Info): Promise<boolean> {
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

  private async generatePhone(): Promise<string> {
    let phoneNumber = Math.floor(Math.random() * 10000000000).toString(); // General 10 random digits
    let exists = await this.phoneExists(phoneNumber);

    while (exists) {
      phoneNumber = Math.floor(Math.random() * 10000000000).toString();
      exists = await this.phoneExists(phoneNumber);

      await Delay(10);
    }
    
    console.log("FOUND FREE PHONE NUMBER", phoneNumber);
    return phoneNumber;
  }

  private async phoneExists(phoneNumber: string): Promise<boolean> {
    const foundNumber = await Database.SendQuery("SELECT id FROM `player_characters` WHERE `phone` = :generatedPhone LIMIT 1", {
      generatedPhone: phoneNumber
    });

    return foundNumber.data.length > 0
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

export class Metadata {
  private fingerprint: string;
  private bloodtype: string | number;
  private isDead: boolean;
  private isCuffed: boolean;
  private licenses: Licenses;
  private mugshot: string;
  private jail: JailData;
  private criminalRecord: CriminalRecord;

  constructor(finger?: string, blood?: string, dead?: boolean, cuffed?: boolean, licenses?: Licenses, mugshot?: string, jail?: JailData, record?: CriminalRecord) { 
    if (dead) {
      this.isDead = dead;
    } else {
      this.isDead = false;
    }
    
    if (cuffed) {
      this.isCuffed = cuffed;
    } else {
      this.isCuffed = false;
    }

    if (mugshot) {
      this.mugshot = mugshot;
    } else {
      this.mugshot = "https://i.imgur.com/mmJcclQ.png";
    }
  }

  // Methods
  public async getMetadata(): Promise<void> {
    if (!this.fingerprint) {
      await this.generateFingerprint();
    }
    
    if (!this.bloodtype) {
      this.bloodtype = Bloodtypes.ABPositive;
    }

    if (!this.licenses) {
      this.licenses = {
        driver: false,
        weapon: false
      }
    }
    
    if (!this.jail) {
      this.jail = {
        inside: false
      }
    }

    if (!this.criminalRecord) {
      this.criminalRecord = {
        hasRecord: false
      }
    }
  }

  private async generateFingerprint(): Promise<string> {
    let fingerprint = `${this.randomString(2)}${this.randomNumber(3)}${this.randomString(1)}${this.randomNumber(2)}${this.randomString(3)}${this.randomNumber(4)}`;
    let exists = await this.fingerExists(fingerprint);

    while (exists) {
      fingerprint = `${this.randomString(2)}${this.randomNumber(3)}${this.randomString(1)}${this.randomNumber(2)}${this.randomString(3)}${this.randomNumber(4)}`;
      exists = await this.fingerExists(fingerprint);

      await Delay(10);
    }
    
    console.log("FOUND FREE FINGERPRINT", fingerprint);
    return fingerprint;
  }

  private async fingerExists(fingerprint: string): Promise<boolean> {
    const foundMeta = await Database.SendQuery("SELECT * FROM `player_characters` WHERE `metadata` LIKE :metadata", {
      metadata: `%${fingerprint}%`
    });

    return foundMeta.data.length > 0
  }

  private randomString(length: number): string {
    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    return result;
  }

  private randomNumber(length: number): string {
    const randomChars = "123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    return result;
  }
}

interface Licenses {
  driver: boolean;
  weapon: boolean;
  flight?: boolean;
}

interface JailData {
  inside: boolean;
  reason?: string;
  length?: number;
}

interface CriminalRecord {
  hasRecord: false
}

interface Info {
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
  metadata: Metadata;
  createdAt: Date;
  lastUpdated: Date;
}