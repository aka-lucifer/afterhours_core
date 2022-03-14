export class Suggestion {
  public name: string;
  public description: string;
  public params: Record<string, any> = {};

  constructor(name: string, description?: string, params?: Record<string, any>) {
    this.name = `/${name}`;
    this.description = description;
    if (params != undefined) {
      this.params = params;
    } else {
      this.params = [];
    }
  }
}
