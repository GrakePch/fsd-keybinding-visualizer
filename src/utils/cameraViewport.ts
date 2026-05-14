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

export type TargetOffsetMarkerInput = Pick<SavedCameraSlot, "id" | "targetOffset">;

export type TargetOffsetMarker = {
  slotId: number;
  label: string;
  position: [number, number, number];
};

const hasFiniteOffset = (offset: Vec3) => isFinite(offset.x) && isFinite(offset.z);

export function getTargetOffsetMarkers(slots: TargetOffsetMarkerInput[]): TargetOffsetMarker[] {
  const slotsWithOffsets = slots.filter((slot) => hasFiniteOffset(slot.targetOffset));
  if (!slotsWithOffsets.length) return [];

  return slotsWithOffsets.map((slot) => ({
    slotId: slot.id,
    label: String(slot.id + 1),
    position: [slot.targetOffset.x, 0, slot.targetOffset.z],
  }));
}
