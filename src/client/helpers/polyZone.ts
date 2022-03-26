import * as Cfx from "fivem-js";
import { Delay } from "../utils";

const eventPrefix = "_PolyZoneJS_:";
const defaultColorWalls = [0, 255, 0];
const defaultColorOutline = [255, 0, 0];
const defaultColorGrid = [255, 255, 255];

type Vector2 = { x:number, y:number }
type Vector3 = { x:number, y:number, z:number }

function toVector2(x:number, y:number): Vector2 {
  return { x, y };
}

const { abs } = Math;
function isLeft(p0: Vector2, p1: Vector2, p2: Vector2) {
  const p0x = p0.x;
  const p0y = p0.y;
  return ((p1.x - p0x) * (p2.y - p0y)) - ((p2.x - p0x) * (p1.y - p0y));
}

function addBlip(pos: Vector2) {
  const blip = AddBlipForCoord(pos.x, pos.y, 0.0);
  SetBlipColour(blip, 7);
  SetBlipDisplay(blip, 8);
  SetBlipScale(blip, 1.0);
  SetBlipAsShortRange(blip, true);
  return blip;
}

function wnInnerLoop(p0: Vector2, p1: Vector2, p2: Vector2, wn: number) {
  const p2y = p2.y;

  if (p0.y <= p2y) {
    if (p1.y > p2y) {
      if (isLeft(p0, p1, p2) > 0) {
        return wn + 1;
      }
    }
  } else if (p1.y <= p2y) {
    if (isLeft(p0, p1, p2) < 0) {
      return wn - 1;
    }
  }

  return wn;
}

function windingNumber(point: Vector2, poly: any) {
  let wn = 0;

  for (let i = 0; i < poly.length - 1; i++) {
    wn = wnInnerLoop(poly[i], poly[i + 1], point, wn);
  }

  wn = wnInnerLoop(poly[poly.length - 1], poly[0], point, wn);

  return wn !== 0;
}

function isIntersecting(a: Vector2, b: Vector2, c: Vector2, d: Vector2) {
  const ax_minus_cx = a.x - c.x;
  const bx_minus_ax = b.x - a.x;
  const dx_minus_cx = d.x - c.x;
  const ay_minus_cy = a.y - c.y;
  const by_minus_ay = b.y - a.y;
  const dy_minus_cy = d.y - c.y;

  const denominator = ((bx_minus_ax) * (dy_minus_cy)) - ((by_minus_ay) * (dx_minus_cx));
  const numerator1 = ((ay_minus_cy) * (dx_minus_cx)) - ((ax_minus_cx) * (dy_minus_cy));
  const numerator2 = ((ay_minus_cy) * (bx_minus_ax)) - ((ax_minus_cx) * (by_minus_ay));

  if (denominator == 0) {
    return numerator1 == 0 && numerator2 == 0;
  }

  const r = numerator1 / denominator;
  const s = numerator2 / denominator;

  return (r >= 0 && r <= 1) && (s >= 0 && s <= 1);
}

function calculatePolygonArea(points: any[]) {
  function det2(i: number, j: number, points2: any[]) {
    return points2[i].x * points2[j].y - points2[j].x * points2[i].y;
  }

  let sum = (points.length > 2 && det2(points.length - 1, 1, points)) || 0;
  for (let i = 0; i < points.length; i++) {
    sum += det2(i, i, points);
  }
  return abs(0.5 * sum);
}

function drawWall(p1: Vector2, p2: Vector2, minZ: number, maxZ: number, r: number, g: number, b: number, a: number) {
  DrawPoly(p1.x, p1.y, minZ, p1.x, p1.y, maxZ, p2.x, p2.y, minZ, r, g, b, a);
  DrawPoly(p1.x, p1.y, maxZ, p2.x, p2.y, maxZ, p2.x, p2.y, minZ, r, g, b, a);
  DrawPoly(p2.x, p2.y, minZ, p2.x, p2.y, maxZ, p1.x, p1.y, maxZ, r, g, b, a);
  DrawPoly(p2.x, p2.y, minZ, p1.x, p1.y, maxZ, p1.x, p1.y, minZ, r, g, b, a);
}

function drawGrid(poly: any) {
  let { minZ } = poly;
  let { maxZ } = poly;
  if (!minZ || !maxZ) {
    const pedPos = Cfx.Game.PlayerPed.Position;
    minZ = pedPos.z - 46.0;
    maxZ = pedPos.z - 45.0;
  }

  const { lines } = poly;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { min } = line;
    const { max } = line;

    DrawLine(min.x + 0.0, min.y + 0.0, maxZ, max.x + 0.0, max.y + 0.0, maxZ + 0.0, defaultColorGrid[0], defaultColorGrid[1], defaultColorGrid[2], 196);
  }
}

function calculateGridCellPoints(cellX: number, cellY: number, poly: any) {
  const { gridCellHeight, gridCellWidth, min } = poly;
  // min added to initial point, in order to shift the grid cells to the poly"s starting position
  const x = cellX * gridCellWidth + min.x;
  const y = cellY * gridCellHeight + min.y;

  return [
    toVector2(x, y),
    toVector2(x + gridCellWidth, y),
    toVector2(x + gridCellWidth, y + gridCellHeight),
    toVector2(x, y + gridCellHeight),
    toVector2(x, y),
  ];
}

function isGridCellInsidePoly(cellX: number, cellY: number, poly: any) {
  const gridCellPoints = calculateGridCellPoints(cellX, cellY, poly);
  const polyPoints = [...poly.points];
  // Connect the polygon to its starting point
  polyPoints[polyPoints.length] = polyPoints[0];

  let isOnePointInPoly = false;
  for (let i = 0; i < gridCellPoints.length - 1; i++) {
    const cellPoint = gridCellPoints[i];
    const { x, y } = cellPoint;

    if (windingNumber(cellPoint, poly.points)) {
      isOnePointInPoly = true;

      if (poly.lines) {
        if (!poly.gridXPoints[x]) {
          poly.gridXPoints[x] = {
            [y]: true,
          };
        }

        if (!poly.gridYPoints[y]) {
          poly.gridYPoints[y] = {
            [x]: true,
          };
        }

      // poly.gridXPoints[x][y] = true;
      // poly.gridYPoints[y][x] = true;
      }
    }
  }

  if (isOnePointInPoly == false) {
    return false;
  }

  // If any of the grid cell"s lines intersects with any of the polygon"s lines
  // then the grid cell is not completely within the poly

  for (let i = 0; i < gridCellPoints.length - 1; i++) {
    const gridCellP1 = gridCellPoints[i];
    const gridCellP2 = gridCellPoints[i + 1];

    for (let j = 0; j < polyPoints.length - 1; j++) {
      if (isIntersecting(gridCellP1, gridCellP2, polyPoints[j], polyPoints[j + 1])) {
        return false;
      }
    }
  }

  return true;
}

function pointInPoly(point: Vector3, poly: any) {
  const { x, y } = point;
  const minX = poly.min.x;
  const minY = poly.min.y;
  const { max } = poly;

  if (x < minX || x > max.x || y < minY || y > max.y) {
    return false;
  }

  const { minZ, maxZ } = poly;

  const { z } = point;

  if ((minZ && z < minZ) || (maxZ && z > maxZ)) {
    return false;
  }

  const { grid } = poly;
  if (grid) {
    const { gridDivisions } = poly;
    const { size } = poly;
    const gridPosX = x - minX;
    const gridPosY = y - minY;
    const gridCellX = (gridPosX * gridDivisions); // size.x
    const gridCellY = (gridPosY * gridDivisions); // size.y

    const first = grid[gridCellY + 1];
    let gridCellValue = first?.[gridCellX + 1];
    if (!gridCellValue && poly.lazyGrid) {
      gridCellValue = isGridCellInsidePoly(gridCellX, gridCellY, poly);
      grid[gridCellY + 1][gridCellX + 1] = gridCellValue;
    }

    if (gridCellValue) {
      return true;
    }
  }

  return windingNumber(point, poly.points);
}

function calculateLinesForDrawingGrid(poly: any) {
  // console.log(poly, "polyy");
  // console.log(poly.gridXPoints, "gridXPoints");
  const lines = {};
  // TODO: this

  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const x in poly.gridXPoints) {
    const gridXPoint = poly.gridXPoints[x];
    const yValues: any[] = [];

    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const gridXPointKey in gridXPoint) {
      yValues[yValues.length] = gridXPointKey;
    }

    // if (yValues.length >= 2) {
    //
    // }

    // console.log(yValues);
  }

  // console.log("calculateLinesForDrawingGrid IS NOT DONE");
}

interface PolyZoneOptions {
  points: {x: number, y: number}[]
  options?: {
    name?: string
    minZ?: number
    maxZ?: number
    gridDivisions?: number
    debugGrid?: boolean
    lazyGrid?: boolean
    data?: any
    debugPoly?: boolean
  }
}

type PolyObj = {
  lines: any;
  name: string
  points: {x: number, y: number}[]
  center: any
  size: any
  max: any
  min: any
  area: any
  minZ: number
  maxZ: number
  useGrid: boolean
  lazyGrid: boolean
  gridDivisions: number
  debugColors: any
  debugPoly: boolean
  debugGrid: boolean
  data: any
  isPolyZone: boolean
}

class PolyZone {
  destroyed = false;

  points: PolyZoneOptions["points"] = [];

  options: PolyZoneOptions["options"] = {
    name: null,
    minZ: null,
    maxZ: null,
    gridDivisions: 30,
    debugGrid: false,
    lazyGrid: true,
    debugPoly: false,
  };

  poly: PolyObj = null;

  constructor(zone: PolyZoneOptions) {
    this.points = zone.points;
    this.options = zone.options;
  }

  private initDebug(poly: any, options: any) {
    if (options.debugBlip) {
      // todo: add blip thing
    }

    const debugEnabled = options.debugPoly || options.debugGrid;
    if (!debugEnabled) return;

    // todo: debug

    setTick(async () => {
      this.draw();
      if (this.options.debugGrid && this.poly.lines) {
        drawGrid(poly);
      }
    });

    // Citizen.CreateThread(function()
    //   while not poly.destroyed do
    //     poly:draw()
    //   if options.debugGrid and poly.lines then
    //     _drawGrid(poly)
    //   end
    //     Citizen.Wait(0)
    //   end
    // end)
  }

  private createGrid(poly: any, options: {
    debugGrid: boolean
  }) {
    poly.gridArea = 0.0;
    poly.gridCellWidth = poly.size.x / poly.gridDivisions;
    poly.gridCellHeight = poly.size.y / poly.gridDivisions;
    this.poly = poly;

    const isInside = [];
    const gridCellArea = poly.gridCellWidth * poly.gridCellHeight;

    for (let y = 0; y < poly.gridDivisions; y++) {
      isInside[y] = [];

      for (let x = 0; x < poly.gridDivisions; x++) {
        if (isGridCellInsidePoly(x, y, poly)) {
          poly.gridArea += gridCellArea;
          isInside[y][x] = true;
        }
      }
    }

    poly.grid = isInside;
    poly.gridCoverage = poly.gridArea / poly.area;
    this.poly = poly;

    if (options.debugGrid) {
      poly.lines = calculateLinesForDrawingGrid(this.poly);
      this.poly = poly;
      console.log(`[PolyZoneJS] Debug: Grid Coverage at ${poly.gridCoverage * 100}% with ${poly.gridDivisions} divisions. Optimal coverage for memory usage and startup time is 80-90%`);
    }
  }

  private calculatePoly(poly: any, options: any) {
    if (!poly.min || !poly.max || !poly.size || !poly.center || !poly.area) {
      let minX = Number.MAX_SAFE_INTEGER;
      let minY = Number.MAX_SAFE_INTEGER;
      let maxX = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;

      for (let i = 0; i < poly.points.length; i++) {
        const p = poly.points[i];
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      const minVector = new Cfx.Vector3(minX, minY, 0);
      const max = new Cfx.Vector3(maxX, maxY, 0);
      const sizeVector = max.subtract(minVector);
      const center = max.add(minVector);
      const cvD = new Cfx.Vector3(center.x, center.y, center.z).divide(2);
      poly.min = { x: minVector.x, y: minVector.y };
      poly.max = { x: max.x, y: max.y };
      poly.size = { x: sizeVector.x, y: sizeVector.y };
      poly.center = { x: cvD.x, y: cvD.y };
      poly.area = calculatePolygonArea(poly.points);
      this.poly = poly;
    }

    poly.boundingRadius = Math.sqrt((poly.size.y * poly.size.y + poly.size.x * poly.size.x) / 2);

    if (poly.useGrid && !poly.lazyGrid) {
      if (options.debugGrid) {
        poly.gridXPoints = {};
        poly.gridYPoints = {};
        poly.lines = {};
        this.poly = poly;
      }

      this.createGrid(poly, options);
    } else if (poly.useGrid) {
      const isInside = [];

      for (let y = 0; y < poly.gridDivisions; y++) {
        isInside[y] = [];
      }

      poly.grid = isInside;
      poly.gridCellWidth = poly.size.x / poly.gridDivisions;
      poly.gridCellHeight = poly.size.y / poly.gridDivisions;
    }

    this.poly = poly;
  }

  public create(additionalOptions: Record<string, any> = {}) {
    const { points, options } = this;
    if (!points[0]) {
      throw new Error("[PolyZoneJS] Error: No points supplied to create");
    }
    if (points.length < 3) console.log("[PolyZoneJS] Warning: Less than 3 points supplied to create");

    const poly = {
      name: options.name,
      points, //
      center: null, //
      size: null, //
      max: null, //
      min: null, //
      area: null, //
      lines: null,
      minZ: options.minZ || null,
      maxZ: options.maxZ || null,
      useGrid: true,
      lazyGrid: options.lazyGrid,
      gridDivisions: options.gridDivisions || 30,
      debugColors: {},
      debugPoly: options.debugGrid || false,
      debugGrid: options.debugGrid || false,
      data: options.data || {},
      isPolyZone: true,
      ...additionalOptions,
    };

    if (poly.debugGrid) {
      poly.lazyGrid = false;
    }

    this.calculatePoly(poly, options);
    this.poly = poly;

    this.initDebug(poly, this.options);
    return this;
  }

  public isPointInside(point: Vector3): boolean {
    if (this.destroyed) {
      console.log(`[PolyZoneJS] Warning isPointInside called on destroyed zone. ${this.options.name}`);
      return false;
    }
    return pointInPoly(point, this.poly);
  }

  public addDebugBlip() {
    return addBlip(this.poly.center);
  }

  private draw(drawDist = 45.0) {
    const [r, g, b] = defaultColorOutline;
    const [wR, wG, wB] = defaultColorWalls;
    const pedPos = Cfx.Game.PlayerPed.Position;
    const minZ = this.options.minZ || pedPos.z - drawDist;
    const maxZ = this.options.maxZ || pedPos.z + drawDist;

    const { points } = this;
    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      DrawLine(point.x, point.y, minZ, point.x, point.y, maxZ, r, g, b, 164);

      if (i < points.length) {
        const point2 = points[i + 1];
        DrawLine(point.x, point.y, maxZ, point2.x, point2.y, maxZ, r, g, b, 184);
        drawWall(point, point2, minZ, maxZ, wR, wG, wB, 48);
      }
    }

    if (points.length > 2) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      DrawLine(firstPoint.x, firstPoint.y, maxZ, lastPoint.x, lastPoint.y, maxZ, r, g, b, 184);
      drawWall(firstPoint, lastPoint, minZ, maxZ, wR, wG, wB, 48);
    }
  }

  public destroy() {
    this.destroyed = true;
    if (this.options.debugGrid) {
      console.log(`[PolyZoneJS] Debug: Destroying zone ${this.options.name}`);
    }
  }

  public onPlayerInOut(onPointInOutCb: (isCurrInside: boolean, pedPos: Cfx.Vector3) => void, waitInMS = 500) {
    let isInside = false;

    setTick(async () => {
      await Delay(waitInMS);
      if (!this.destroyed) {
        const pos = Cfx.Game.PlayerPed.Position;
        const currInside = this.isPointInside(pos);
        if (currInside !== isInside) {
          onPointInOutCb(currInside, pos);
          isInside = currInside;
        }
      }
    });
  }
}

export default PolyZone;