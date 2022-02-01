export class ClientCallback {
  public callbackName: string;
  public serverId: string;
  public data: Record<string, any> = {};
  public callbackFunction: CallableFunction;

  constructor(name: string, server_id: string, data: Record<string, any>, func: CallableFunction) {
    this.callbackName = name;
    this.serverId = server_id;
    this.data = data;
    this.callbackFunction = func;
  }
}
