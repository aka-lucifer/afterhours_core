export class ServerCallback {
  public callbackName: string;
  public data: Record<string, any> = {};
  public callbackFunction: CallableFunction;

  constructor(name: string, data: Record<string, any>, func: CallableFunction) {
    this.callbackName = name;
    this.data = data;
    this.callbackFunction = func;
  }
}
