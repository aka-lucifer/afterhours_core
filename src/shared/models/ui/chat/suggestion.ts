export class Suggestion {
  public name: string;
  public description: string;
  public commandParams: Record<string, any> = {};

  constructor(name: string, description?: string, params?: Record<string, any>) {
    this.name = `/${name}`;
    this.description = description;
    if (params != undefined) {
      this.commandParams = params;
    } else {
      this.commandParams = [];
    }
  }
}
