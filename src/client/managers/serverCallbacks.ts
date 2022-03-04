import {ServerCallback} from "../models/serverCallback";

import {Client} from "../client";

import {Events} from "../../shared/enums/events/events";

export class ServerCallbackManager {
  private client: Client;
  private registeredCallbacks: Record<number, CallableFunction> = {};

  constructor(client: Client) {
    this.client = client;

    // Detect Returned Server CB
    onNet(Events.receiveServerCB, (result, data ) => {
      this.registeredCallbacks[data.callbackID](result, data);
      delete this.registeredCallbacks[data.callbackID];
    });
  }

  public Add(callbackData: ServerCallback) {
    const id = Object.keys(this.registeredCallbacks).length++;
    this.registeredCallbacks[id] = callbackData.callbackFunction;
    callbackData.data["callbackID"] = id;
    emitNet(callbackData.callbackName, callbackData.data);
  }
}
