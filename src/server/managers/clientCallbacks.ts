import { ClientCallback } from "../models/clientCallback";

import { Server } from "../server";

import {Events} from "../../shared/enums/events/events";

export class ClientCallbackManager {

  private server: Server;
  private registeredCallbacks: Record<number, CallableFunction> = {};

  constructor(server: Server) {
    this.server = server;

    // Detect Returned Client CB
    onNet(Events.receiveClientCB, (result, data ) => {
      this.registeredCallbacks[data.callbackID](result, data);
      delete this.registeredCallbacks[data.callbackID];
    });
  }

  public Add(callbackData: ClientCallback): void {
    const id = Object.keys(this.registeredCallbacks).length++;
    this.registeredCallbacks[id] = callbackData.callbackFunction;
    callbackData.data["callbackID"] = id;
    emitNet(callbackData.callbackName, callbackData.serverId, callbackData.data);
  }
}
