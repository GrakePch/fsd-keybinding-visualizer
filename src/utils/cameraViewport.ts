import type { SavedCameraSlot, Vec3 } from "../types/savedViews";
import type { VehicleModelBounds } from "../types/vehicleModel";

export type CameraFit = {
  target: [number, number, number];
  cameraPosition: [number, number, number];
  viewHeight: number;
  near: number;
  far: number;
};

export type VehicleGrid = {
  min: [number, number, number];
  max: [number, number, number];
};

export type TargetOffsetBoundingBox = {
  min: [number, number, number];
  max: [number, number, number];
};

export type TargetOffsetBoundingBoxRange = {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z: { min: number; max: number };
};

export const VEHICLE_MODEL_METERS_PER_SOURCE_UNIT = 0.01;
const CAMERA_NEAR_PLANE_METERS = 0.01;
const ORTHOGRAPHIC_CAMERA_OFFSET_X_DIRECTION = 1.8;
const ORTHOGRAPHIC_CAMERA_OFFSET_Y_DIRECTION = 5.5;
const ORTHOGRAPHIC_CAMERA_OFFSET_Z_DIRECTION = 1.8;
const ORTHOGRAPHIC_CAMERA_BACK_DISTANCE_MARGIN_METERS = 1;
const VEHICLE_GRID_SPACING_METERS = 10;
const GRID_LINE_EPSILON = 1e-9;

// The camera editor viewport intentionally follows the source vehicle/saved-view
// coordinate system instead of Three.js's default Y-up convention:
//   X = lateral, Y = forward/back, Z = vertical/up.

const DEFAULT_CAMERA_FIT: CameraFit = {
  target: [0, 0, 0],
  cameraPosition: [80, 240, 80],
  viewHeight: 240,
  near: CAMERA_NEAR_PLANE_METERS,
  far: 2000,
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

type CameraFitOptions = {
  maxCameraMarkerDistance?: number;
};

export function getCameraFitFromBounds(bounds: VehicleModelBounds | null | undefined, options: CameraFitOptions = {}): CameraFit {
  if (!bounds || !isFinite(bounds.radius) || bounds.radius <= 0) {
    return DEFAULT_CAMERA_FIT;
  }

  const [centerX, centerY, centerZ] = bounds.center.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const [sourceSizeX, sourceSizeY, sourceSizeZ] = bounds.size.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const radius = bounds.radius * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT;
  const boundsDiagonalHalf = Math.sqrt(sourceSizeX * sourceSizeX + sourceSizeY * sourceSizeY + sourceSizeZ * sourceSizeZ) / 2;
  const maxCameraMarkerDistance = isFinite(options.maxCameraMarkerDistance as number) ? Math.max(options.maxCameraMarkerDistance as number, 0) : 0;
  const cameraBackDistance = boundsDiagonalHalf + maxCameraMarkerDistance + CAMERA_NEAR_PLANE_METERS + ORTHOGRAPHIC_CAMERA_BACK_DISTANCE_MARGIN_METERS;
  const offsetDirectionLength = Math.sqrt(
    ORTHOGRAPHIC_CAMERA_OFFSET_X_DIRECTION * ORTHOGRAPHIC_CAMERA_OFFSET_X_DIRECTION +
      ORTHOGRAPHIC_CAMERA_OFFSET_Y_DIRECTION * ORTHOGRAPHIC_CAMERA_OFFSET_Y_DIRECTION +
      ORTHOGRAPHIC_CAMERA_OFFSET_Z_DIRECTION * ORTHOGRAPHIC_CAMERA_OFFSET_Z_DIRECTION,
  );
  const cameraOffsetScale = cameraBackDistance / offsetDirectionLength;

  return {
    target: [centerX, centerY, centerZ],
    cameraPosition: [
      centerX + ORTHOGRAPHIC_CAMERA_OFFSET_X_DIRECTION * cameraOffsetScale,
      centerY + ORTHOGRAPHIC_CAMERA_OFFSET_Y_DIRECTION * cameraOffsetScale,
      centerZ + ORTHOGRAPHIC_CAMERA_OFFSET_Z_DIRECTION * cameraOffsetScale,
    ],
    viewHeight: radius * 2.8,
    near: CAMERA_NEAR_PLANE_METERS,
    far: 2000,
  };
}

export function getTargetOffsetBoundingBox(ranges: TargetOffsetBoundingBoxRange | null | undefined): TargetOffsetBoundingBox | null {
  if (!ranges || !isUsableRange(ranges.x) || !isUsableRange(ranges.y) || !isUsableRange(ranges.z)) {
    return null;
  }

  return {
    min: [ranges.x.min, ranges.y.min, ranges.z.min],
    max: [ranges.x.max, ranges.y.max, ranges.z.max],
  };
}

function isUsableRange(range: { min: number; max: number }) {
  return isFinite(range.min) && isFinite(range.max) && range.min < range.max;
}

export function getTargetOffsetBoundingBoxEdgePoints(bounds: TargetOffsetBoundingBox): [number, number, number][] {
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const corners = {
    minMinMin: [minX, minY, minZ] as [number, number, number],
    maxMinMin: [maxX, minY, minZ] as [number, number, number],
    maxMaxMin: [maxX, maxY, minZ] as [number, number, number],
    minMaxMin: [minX, maxY, minZ] as [number, number, number],
    minMinMax: [minX, minY, maxZ] as [number, number, number],
    maxMinMax: [maxX, minY, maxZ] as [number, number, number],
    maxMaxMax: [maxX, maxY, maxZ] as [number, number, number],
    minMaxMax: [minX, maxY, maxZ] as [number, number, number],
  };

  return [
    corners.minMinMin,
    corners.maxMinMin,
    corners.maxMinMin,
    corners.maxMaxMin,
    corners.maxMaxMin,
    corners.minMaxMin,
    corners.minMaxMin,
    corners.minMinMin,
    corners.minMinMax,
    corners.maxMinMax,
    corners.maxMinMax,
    corners.maxMaxMax,
    corners.maxMaxMax,
    corners.minMaxMax,
    corners.minMaxMax,
    corners.minMinMax,
    corners.minMinMin,
    corners.minMinMax,
    corners.maxMinMin,
    corners.maxMinMax,
    corners.maxMaxMin,
    corners.maxMaxMax,
    corners.minMaxMin,
    corners.minMaxMax,
  ];
}

export function getVehicleGridFromTargetOffsetBoundingBox(bounds: TargetOffsetBoundingBox | null | undefined): VehicleGrid | null {
  if (!bounds || !isUsableRange({ min: bounds.min[0], max: bounds.max[0] }) || !isUsableRange({ min: bounds.min[1], max: bounds.max[1] }) || !isFinite(bounds.min[2])) {
    return null;
  }

  return {
    min: [bounds.min[0], bounds.min[1], bounds.min[2]],
    max: [bounds.max[0], bounds.max[1], bounds.min[2]],
  };
}

export function getVehicleGridLineValues(min: number, max: number, spacing = VEHICLE_GRID_SPACING_METERS): number[] {
  if (!isFinite(min) || !isFinite(max) || !isFinite(spacing) || spacing <= 0 || min > max) {
    return [];
  }

  const values = [normalizeNearZero(min), 0, normalizeNearZero(max)];
  for (let value = spacing; value < max - GRID_LINE_EPSILON; value += spacing) {
    values.push(normalizeNearZero(value));
  }
  for (let value = -spacing; value > min + GRID_LINE_EPSILON; value -= spacing) {
    values.push(normalizeNearZero(value));
  }

  return values
    .sort((a, b) => a - b)
    .filter((value, index, sortedValues) => index === 0 || Math.abs(value - sortedValues[index - 1]) > GRID_LINE_EPSILON);
}

function normalizeNearZero(value: number) {
  return Math.abs(value) < GRID_LINE_EPSILON ? 0 : value;
}

export type CameraPositionMarkerInput = Pick<SavedCameraSlot, "id" | "targetOffset" | "cameraRotationAngle" | "distance" | "lensSize" | "fStop">;

export type CameraPositionMarker = {
  slotId: number;
  label: string;
  targetPosition: [number, number, number];
  cameraPosition: [number, number, number];
  cameraRotationAngle: Vec3;
  lensSize: number;
  fStop: number;
};

type CameraPositionMarkerOptions = {
  minimumDistance?: number;
};

const hasFiniteCameraPositionInputs = (slot: CameraPositionMarkerInput) =>
  isFinite(slot.targetOffset.x) &&
  isFinite(slot.targetOffset.y) &&
  isFinite(slot.targetOffset.z) &&
  isFinite(slot.cameraRotationAngle.x) &&
  isFinite(slot.cameraRotationAngle.y) &&
  isFinite(slot.cameraRotationAngle.z) &&
  isFinite(slot.distance) &&
  isFinite(slot.lensSize) &&
  isFinite(slot.fStop);

export function savedViewPositionToViewportPosition(position: Vec3): [number, number, number] {
  return [position.x, position.y, position.z];
}

export function getCameraBoomDirection(rotationAngle: Vec3): [number, number, number] {
  return rotateVectorByCameraRotation([0, -1, 0], rotationAngle);
}

export function getCameraRotationUpVector(rotationAngle: Vec3): [number, number, number] {
  return rotateVectorByCameraRotation([0, 0, 1], rotationAngle);
}

function rotateVectorByCameraRotation(vector: [number, number, number], rotationAngle: Vec3): [number, number, number] {
  // Saved camera rotations are applied in source/game order: Y, then local X, then world Z.
  // The X axis itself follows the preceding Y rotation, matching the in-game camera axes.
  const afterY = rotateVectorAroundAxis(vector, [0, 1, 0], rotationAngle.y);
  const localXAxisAfterY = rotateVectorAroundAxis([1, 0, 0], [0, 1, 0], rotationAngle.y);
  const afterX = rotateVectorAroundAxis(afterY, localXAxisAfterY, rotationAngle.x);

  return rotateVectorAroundAxis(afterX, [0, 0, 1], rotationAngle.z);
}

function rotateVectorAroundAxis(vector: [number, number, number], axis: [number, number, number], degrees: number): [number, number, number] {
  const radians = toRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const oneMinusCos = 1 - cos;
  const [x, y, z] = vector;
  const [axisX, axisY, axisZ] = axis;

  return [
    x * (cos + axisX * axisX * oneMinusCos) + y * (axisX * axisY * oneMinusCos - axisZ * sin) + z * (axisX * axisZ * oneMinusCos + axisY * sin),
    x * (axisY * axisX * oneMinusCos + axisZ * sin) + y * (cos + axisY * axisY * oneMinusCos) + z * (axisY * axisZ * oneMinusCos - axisX * sin),
    x * (axisZ * axisX * oneMinusCos - axisY * sin) + y * (axisZ * axisY * oneMinusCos + axisX * sin) + z * (cos + axisZ * axisZ * oneMinusCos),
  ];
}

export function getCameraPositionMarkers(slots: CameraPositionMarkerInput[], options: CameraPositionMarkerOptions = {}): CameraPositionMarker[] {
  const minimumDistance = isFinite(options.minimumDistance as number) ? (options.minimumDistance as number) : null;

  return slots.filter(hasFiniteCameraPositionInputs).map((slot) => {
    const targetPosition = savedViewPositionToViewportPosition(slot.targetOffset);
    const boomDirection = getCameraBoomDirection(slot.cameraRotationAngle);
    const renderDistance = minimumDistance === null ? slot.distance : Math.max(slot.distance, minimumDistance);

    return {
      slotId: slot.id,
      label: String(slot.id + 1),
      targetPosition,
      cameraPosition: [
        targetPosition[0] + boomDirection[0] * renderDistance,
        targetPosition[1] + boomDirection[1] * renderDistance,
        targetPosition[2] + boomDirection[2] * renderDistance,
      ],
      cameraRotationAngle: slot.cameraRotationAngle,
      lensSize: slot.lensSize,
      fStop: slot.fStop,
    };
  });
}
