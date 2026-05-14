import type { SavedCameraSlot, Vec3 } from "../types/savedViews";
import type { VehicleModelBounds } from "../types/vehicleModel";

export type CameraFit = {
  target: [number, number, number];
  cameraPosition: [number, number, number];
  near: number;
  far: number;
};

export const VEHICLE_MODEL_METERS_PER_SOURCE_UNIT = 0.01;

const DEFAULT_CAMERA_FIT: CameraFit = {
  target: [0, 0, 0],
  cameraPosition: [0, 60, 240],
  near: 0.1,
  far: 2000,
};

export function getCameraFitFromBounds(bounds: VehicleModelBounds | null | undefined): CameraFit {
  if (!bounds || !isFinite(bounds.radius) || bounds.radius <= 0) {
    return DEFAULT_CAMERA_FIT;
  }

  const [centerX, centerY, centerZ] = bounds.center.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const radius = bounds.radius * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT;

  return {
    target: [centerX, centerY, centerZ],
    cameraPosition: [centerX, centerY + radius * 0.5, centerZ + radius * 2.4],
    near: Math.max(radius / 100, 0.1),
    far: radius * 10,
  };
}

export type CameraPositionMarkerInput = Pick<SavedCameraSlot, "id" | "targetOffset" | "cameraRotationAngle" | "distance">;

export type CameraPositionMarker = {
  slotId: number;
  label: string;
  targetPosition: [number, number, number];
  cameraPosition: [number, number, number];
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const hasFiniteCameraPositionInputs = (slot: CameraPositionMarkerInput) =>
  isFinite(slot.targetOffset.x) &&
  isFinite(slot.targetOffset.y) &&
  isFinite(slot.targetOffset.z) &&
  isFinite(slot.cameraRotationAngle.x) &&
  isFinite(slot.cameraRotationAngle.z) &&
  isFinite(slot.distance);

export function savedViewPositionToViewportPosition(position: Vec3): [number, number, number] {
  return [position.x, position.z, position.y];
}

export function getCameraBoomDirection(rotationAngle: Vec3): [number, number, number] {
  const pitch = toRadians(rotationAngle.x);
  const yaw = toRadians(rotationAngle.z);
  const horizontalDistance = Math.cos(pitch);

  return [Math.sin(yaw) * horizontalDistance, -Math.sin(pitch), Math.cos(yaw) * horizontalDistance];
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
    };
  });
}
