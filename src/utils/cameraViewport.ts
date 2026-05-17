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
  center: [number, number, number];
  span: number;
};

export const VEHICLE_MODEL_METERS_PER_SOURCE_UNIT = 0.01;
const CAMERA_NEAR_PLANE_METERS = 0.01;
const ORTHOGRAPHIC_CAMERA_OFFSET_X_RADIUS_MULTIPLIER = 1.8;
const ORTHOGRAPHIC_CAMERA_OFFSET_Y_RADIUS_MULTIPLIER = 5.5;
const ORTHOGRAPHIC_CAMERA_OFFSET_Z_RADIUS_MULTIPLIER = 1.8;
const VEHICLE_GRID_SPACING_METERS = 5;
const DEFAULT_VEHICLE_GRID_CELL_COUNT = 12;
const GRID_SPAN_ROUNDING_EPSILON = 1e-9;

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

export function getCameraFitFromBounds(bounds: VehicleModelBounds | null | undefined): CameraFit {
  if (!bounds || !isFinite(bounds.radius) || bounds.radius <= 0) {
    return DEFAULT_CAMERA_FIT;
  }

  const [centerX, centerY, centerZ] = bounds.center.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const radius = bounds.radius * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT;

  return {
    target: [centerX, centerY, centerZ],
    cameraPosition: [
      centerX + radius * ORTHOGRAPHIC_CAMERA_OFFSET_X_RADIUS_MULTIPLIER,
      centerY + radius * ORTHOGRAPHIC_CAMERA_OFFSET_Y_RADIUS_MULTIPLIER,
      centerZ + radius * ORTHOGRAPHIC_CAMERA_OFFSET_Z_RADIUS_MULTIPLIER,
    ],
    viewHeight: radius * 2.8,
    near: CAMERA_NEAR_PLANE_METERS,
    far: 2000,
  };
}

export function getVehicleGridFromBounds(bounds: VehicleModelBounds | null | undefined): VehicleGrid | null {
  if (!bounds) {
    return getDefaultVehicleGrid();
  }

  if (bounds.size.some((value) => !isFinite(value) || value <= 0)) {
    return null;
  }

  const [sourceCenterX, sourceCenterY, sourceCenterZ] = bounds.center.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const [sourceSizeX, sourceSizeY, sourceSizeZ] = bounds.size.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const span = getEvenCellGridSpan(Math.max(sourceSizeX, sourceSizeY) * 1.1);

  return {
    center: [sourceCenterX, sourceCenterY, sourceCenterZ - sourceSizeZ / 2 - 1],
    span,
  };
}

function getDefaultVehicleGrid(): VehicleGrid {
  return {
    center: [0, 0, 0],
    span: DEFAULT_VEHICLE_GRID_CELL_COUNT * VEHICLE_GRID_SPACING_METERS,
  };
}

function getEvenCellGridSpan(rawSpan: number) {
  const cellCount = Math.ceil((rawSpan - GRID_SPAN_ROUNDING_EPSILON) / VEHICLE_GRID_SPACING_METERS);
  const evenCellCount = cellCount % 2 === 0 ? cellCount : cellCount + 1;

  return evenCellCount * VEHICLE_GRID_SPACING_METERS;
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

export function getCameraPositionMarkers(slots: CameraPositionMarkerInput[]): CameraPositionMarker[] {
  return slots.filter(hasFiniteCameraPositionInputs).map((slot) => {
    const targetPosition = savedViewPositionToViewportPosition(slot.targetOffset);
    const boomDirection = getCameraBoomDirection(slot.cameraRotationAngle);

    return {
      slotId: slot.id,
      label: String(slot.id + 1),
      targetPosition,
      cameraPosition: [
        targetPosition[0] + boomDirection[0] * slot.distance,
        targetPosition[1] + boomDirection[1] * slot.distance,
        targetPosition[2] + boomDirection[2] * slot.distance,
      ],
      cameraRotationAngle: slot.cameraRotationAngle,
      lensSize: slot.lensSize,
      fStop: slot.fStop,
    };
  });
}
