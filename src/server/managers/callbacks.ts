import {Server} from "../server";

export class CallbackManager {
  private server: Server;

  private clCallbacks: Record<string, any> = {};
  private svCallbacks: Record<string, any> = {};

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public TriggerClientCallback(name: string, cb: CallableFunction, data: any, handle: number): any {
    const e = `afterhours:client:callback`;
    const sendEvent = `${e}:${name}`;
    const returnEvent = `${e}:${name}_return`;

    if (!this.clCallbacks[returnEvent]) {
      this.clCallbacks[returnEvent] = cb;
      onNet(returnEvent, (...args: any[]) => {
        args = args[0];
        cb = this.clCallbacks[returnEvent];
        cb(args);
        console.log("server -> client -> server (CB DATA)", sendEvent, args);
      });
    }

    emitNet(sendEvent, handle, data);
  }

  public RegisterCallback(name: string, cb: CallableFunction): void {
    if (!this.svCallbacks[name]) { // If no callback made/found!
      const e = `afterhours:server:callback:${name}`;
      this.svCallbacks[name] = cb;
      onNet(e, (...args: any[]) => {
        const src = source;
        args = args[0]; // Converts it from an array to an object
        this.svCallbacks[name](args, src, (data: any) => {
          TriggerClientEvent(`${e}_return`, src, data);
        });
      });
    }
  }
}
