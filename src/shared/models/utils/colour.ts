export const RGB_COLOUR_REGEX = /\((\d+),\s*(\d+),\s*(\d+)(,\s*(\d*.\d*))?\)/;

export class Colour {
  public r: number;
  public g: number;
  public b: number;
  public a: number;

  // constructor()
  // constructor(colourStr?: string)
  // constructor(r?: string|number, g?: number, b?: number)
  constructor(r?: string|number, g?: number, b?: number, a?: number) {
    if (typeof r === 'string') {
      r = r.trim();
      if (r.indexOf('#') === 0) {
        r = r.substr(r.indexOf('#') + 1);
        this.r = parseInt(r.substr(0, 2), 16);
        this.g = parseInt(r.substr(2, 2), 16);
        this.b = parseInt(r.substr(4, 2), 16);
      } else if (r.indexOf('rgb') === 0) {
        const res = RGB_COLOUR_REGEX.exec(r);
        this.r = parseInt(res[1], 10);
        this.g = parseInt(res[2], 10);
        this.b = parseInt(res[3], 10);
        this.a = res[5] ? parseFloat(res[5]) : 1;
      }
    } else {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a || 1;
    }
  }

  toHex() {
    return '#' + this.r.toString(16) + this.g.toString(16) + this.b.toString(16);
  }

  toRgb() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  toRgba() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  rgbNumber() {
		const rgb = [this.r, this.g, this.b];
		return ((rgb[0] & 0xFF) << 16) | ((rgb[1] & 0xFF) << 8) | (rgb[2] & 0xFF);
	}
}