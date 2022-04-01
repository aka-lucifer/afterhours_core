import { Vector3 } from 'fivem-js';
import { Vec3 } from 'fivem-js/lib/utils/Vector3';
import { PolyZone } from './PolyZone';

function toVector3(x: number, y: number, z: number) {
  return { x, y, z };
}

function toVector2(x: number, y: number) {
  return { x, y };
}

function calculateScaleAndOffset(options: any) {
  let scale = options.scale || [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
  let offset = options.offset || [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

  if (scale.length !== 3 && scale.length !== 6) return console.log('Scale must be of length 3 or 6');
  if (offset.length !== 3 && offset.length !== 6) return console.log('Offset must be of length 3 or 6');
  if (scale.length === 3) {
    scale = [scale[0], scale[0], scale[1], scale[1], scale[2], scale[2]];
  }

  if (offset.length === 3) {
    offset = [offset[0], offset[0], offset[1], offset[1], offset[2], offset[2]];
  }

  const minOffset = toVector3(offset[2], offset[1], offset[5]);
  const maxOffset = toVector3(offset[3], offset[0], offset[4]);
  const minScale = toVector3(scale[2], scale[1], scale[5]);
  const maxScale = toVector3(scale[3], scale[0], scale[4]);
  return {
    minOffset, maxOffset, minScale, maxScale,
  };
}

function calculatePoints(center: Vec3, length: number, width: number, minScale: Vec3, maxScale: Vec3, minOffset: Vec3, maxOffset: Vec3) {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  let min = new Vector3(-halfWidth, -halfLength, 0.0);
    let max = new Vector3(halfWidth, halfLength, 0.0);

    min = min.multiply(minScale);
    min = min.subtract(minOffset);

    max = max.multiply(maxScale);
    const newMax = max.add(maxOffset);

    // -- Box vertices
    const centerXy = new Vector3(center.x, center.y, 0);
    const p1 = new Vector3(min.x, min.y, 0).add(centerXy);
    const p2 = new Vector3(newMax.x, min.y, 0).add(centerXy);
    const p3 = new Vector3(newMax.x, newMax.y, 0).add(centerXy);
    const p4 = new Vector3(min.x, newMax.y, 0).add(centerXy);
    return [
      p1, p2, p3, p4,
    ];
  }

  interface BoxZoneOptions {
    box: {x: number, y: number, z: number, l: number, w: number}
    options?: {
    name?: string
    heading?: number
    scale?: [number?, number?, number?]
    offset?: [number?, number?, number?]
    minZ?: number
    maxZ?: number
    data?: any
    debugPoly?: boolean
  }
}

const defaultMinOffset = toVector3(0, 0, 0);
const defaultMaxOffset = toVector3(0, 0, 0);
const defaultMinScale = toVector3(1, 1, 1);
const defaultMaxScale = toVector3(1, 1, 1);
const defaultScaleZ = [defaultMinScale.z, defaultMaxScale.z];
const defaultOffsetZ = [defaultMinOffset.z, defaultMaxOffset.z];

export class BoxZone {
  options: any | BoxZoneOptions['options'] = {};

  box: BoxZoneOptions['box'] = null;

  zone: any = null;

  constructor(zone: BoxZoneOptions) {
    this.box = zone.box;
    this.options = zone.options;
    //
    // const poly = this.create(this.points, this.options);
    // this.initDebug(poly, this.options);
  }

  private new() {
    // center: Vec3, length: number, width: number, options: any
    const center = toVector3(this.box.x, this.box.y, this.box.z);
    const length = this.box.l;
    const width = this.box.w;
    const { options } = this;

    let minOffset = defaultMinOffset;
    let maxOffset = defaultMaxOffset;
    let minScale = defaultMinScale;
    let maxScale = defaultMaxScale;
    let scaleZ = defaultScaleZ;
    let offsetZ = defaultOffsetZ;

    if (options.scale !== null || options.offset !== null) {
      const offAndScale = calculateScaleAndOffset(options);
      if (offAndScale) {
        minOffset = offAndScale.minOffset;
        maxOffset = offAndScale.maxOffset;
        minScale = offAndScale.minScale;
        maxScale = offAndScale.maxScale;

        scaleZ = [minScale.z, maxScale.z];
        offsetZ = [minOffset.z, maxOffset.z];
      }
    }

    const points = calculatePoints(center, length, width, minScale, maxScale, minOffset, maxOffset);
    const min = new Vector3(points[0].x, points[0].y, points[0].z);
    const max = new Vector3(points[2].x, points[2].y, points[2].z); // TODO: maybe [3]
    const size = min.subtract(max);

    options.useGrid = false;
    options.min = min;
    options.max = max;
    options.size = size;
    options.center = center;
    options.area = size.x * size.y;

    this.options = options;

    const zone = new PolyZone({
      points,
      options,
    }).create({
      length,
      width,
      startPos: toVector2(center.x, center.y),
      offsetPos: toVector2(0, 0),
      offsetRot: options.heading || 0.0,
      minScale,
      maxScale,
      minOffset,
      maxOffset,
      scaleZ,
      offsetZ,
      isBoxZone: true,
    });
    this.zone = zone;
    return zone;
  }

  public create() {
    const zone = this.new();
    this.initDebug(zone);

    return zone;
  }

  private initDebug(zone: PolyZone) {
    const { options } = this;
    if (options.debugBlip) {
      zone.addDebugBlip();
    }
  }

  public rotate(origin: Vec3, point: Vec3, theta: number) {
    if (!theta) return point;
    const pointVector = new Vector3(point.x, point.y, 0);

    const p = pointVector.subtract(origin);
    const pX = p.x;
    const pY = p.y;

    const the = theta * (Math.PI / 180);
    const cosTheta = Math.cos(the);
    const sinTheta = Math.sin(the);
    const x = pX * cosTheta - pY * sinTheta;
    const y = pX * sinTheta + pY * cosTheta;

    return new Vector3(x, y, 0).add(origin);
  }
}

// export default BoxZone;