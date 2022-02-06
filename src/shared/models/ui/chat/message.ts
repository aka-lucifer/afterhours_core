export class Message {
  public content: string;
  public type: number | string;

  constructor (message: string, type: number | string) {
    this.content = message;
    this.type = type;
  }
}
