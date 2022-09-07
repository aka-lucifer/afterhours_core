import {Client} from "../client";

export class CallbackManager {
  private client: Client;

  private clCallbacks: Record<string, any> = {};
  private svCallbacks: Record<string, any> = {};

  constructor(client: Client) {
    this.client = client;
  }

  // Methods
  public TriggerServerCallback(name: string, cb: CallableFunction, data: any): any {
    const e = `afterhours:server:callback`;
    const sendEvent = `${e}:${name}`;
    const returnEvent = `${e}:${name}_return`;
    if (!this.svCallbacks[returnEvent]) {
      this.svCallbacks[returnEvent] = cb;
      onNet(returnEvent, (...args: any[]) => {
        args = args[0];
        cb = this.svCallbacks[returnEvent];
        console.log("client -> server -> client (CB DATA)", sendEvent, args);
        cb(args);
      });
    }

    emitNet(sendEvent, data);
  }

  public RegisterCallback(name: string, cb: CallableFunction): void {
    if (!this.clCallbacks[name]) { // If no callback made/found!
      const e = `afterhours:client:callback:${name}`;
      this.clCallbacks[name] = cb;
      onNet(e, (...args: any[]) => {
        args = args[0]; // Converts it from an array to an object
        this.clCallbacks[name](args, (data: any) => {
          TriggerServerEvent(`${e}_return`, data);
        });
      });
    }
  }
}
