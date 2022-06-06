import { Inform } from '../../utils';

const zoomLevels = [ 900, 1000, 1100, 1200, 1300 ];

export class Minimap {
  private zoomLevel: number = 0;

  constructor() {
    Inform("Minimap | World Controller", "Started!");

    // Key Bindings
    RegisterCommand("+minimap_zoom_in", () => {
      if (this.zoomLevel === 0) { // If first entry
        this.zoomLevel = zoomLevels.length - 1;
      } else {
        this.zoomLevel = this.zoomLevel - 1;
      }

      SetRadarZoom(zoomLevels[this.zoomLevel]);
    }, false);

    RegisterCommand("+minimap_zoom_out", () => {
      if (this.zoomLevel === (zoomLevels.length - 1)) { // If we're fully zoomed out, zoom all the way back in
        this.zoomLevel = 0;
      } else { // Zoom out one option
        this.zoomLevel = this.zoomLevel + 1;
      }

      SetRadarZoom(zoomLevels[this.zoomLevel]);
    }, false);
  }

  // Methods
  public init(): void {
    SetRadarZoom(zoomLevels[this.zoomLevel]);
  }
}
