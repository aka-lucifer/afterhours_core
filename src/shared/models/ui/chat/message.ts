import { ChatTypes, SystemTypes } from "../../../enums/ui/chat/types";

export class Message {
  public content: string;
  public type: number | string;

  constructor (message: string, type: ChatTypes | SystemTypes) {
    this.content = message;
    this.type = type;
  }
}
