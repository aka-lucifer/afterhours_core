import {Server} from "../server";

export class CallbackManager {
  private server: Server;

  private clCallbacks: Record<string, any> = {};
  private svCallbacks: Record<string, any> = {};

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public TriggerClientCallback(name: string, cb: CallableFunction, data: any, handle: number, triggeredBy: number): any {
    const passedHandle = handle;
    const triggeredHandle = triggeredBy;
    const e = `afterhours:client:callback`;
    const sendEvent = `${e}:${name}`;
    const returnEvent = `${e}:${name}_return`;

    if (!this.clCallbacks[returnEvent]) {
      this.clCallbacks[returnEvent] = cb;
      onNet(returnEvent, (returnedData: any[], triggeredHandle: number) => {
        cb = this.clCallbacks[returnEvent];
        cb(returnedData, source, triggeredHandle);
        console.log("server -> client -> server (CB DATA)", sendEvent, returnedData, passedHandle, handle, source);
      });
    }

    emitNet(sendEvent, handle, data, triggeredBy);
  }

  public RegisterCallback(name: string, cb: CallableFunction): void {
    if (!this.svCallbacks[name]) { // If no callback made/found!
      const e = `afterhours:server:callback:${name}`;
      this.svCallbacks[name] = cb;
      onNet(e, (...args: any[]) => {
        const src = source;
        const returnedData = args[0]; // Converts it from an array to an object
        this.svCallbacks[name](returnedData, src, (data: any) => {
          TriggerClientEvent(`${e}_return`, src, data);
        });
      });
    }
  }
}
