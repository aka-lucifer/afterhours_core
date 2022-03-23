export class Vehicle {
  private id: number;
  private ownerId: number;
  private label: string;
  private model: string;
  private type: string;
  private colour: string;
  private plate: string;
  private registeredOn: string;

  constructor(data: vehData) {
    this.ownerId = data.ownerId;
    this.label = data.label;
    this.model = data.model;
    this.type = data.type;
    this.colour = data.colour;
    this.plate = data.plate;
    this.registeredOn = data.registeredOn;
  }

  // Get & Set Requests
  public get Id(): number {
    return this.id;
  }

  public set Id(newId: number) {
    this.id = newId;
  }

  public get Owner(): number {
    return this.ownerId;
  }

  public get Label(): string {
    return this.label;
  }

  public get Model(): string {
    return this.model;
  }

  public get Type(): string {
    return this.type;
  }

  public get Colour(): string {
    return this.colour;
  }

  public get Plate(): string {
    return this.plate;
  }

  public get Registered(): string {
    return this.registeredOn;
  }
}

interface vehData {
  id: number;
  ownerId: number;
  label: string;
  model: string;
  type: string;
  colour: string;
  plate: string;
  registeredOn: string;
}