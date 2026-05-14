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

const TARGET_OFFSET_MARKER_SPREAD_METERS = 1.5;

const hasFiniteOffset = (offset: Vec3) => isFinite(offset.x) && isFinite(offset.z);

export function getTargetOffsetMarkers(slots: TargetOffsetMarkerInput[]): TargetOffsetMarker[] {
  const slotsWithOffsets = slots.filter((slot) => hasFiniteOffset(slot.targetOffset));
  if (!slotsWithOffsets.length) return [];

  const markersAtPosition = slotsWithOffsets.reduce<Record<string, typeof slotsWithOffsets>>((positions, slot) => {
    const key = `${slot.targetOffset.x}:${slot.targetOffset.z}`;
    positions[key] = [...(positions[key] || []), slot];
    return positions;
  }, {});

  return slotsWithOffsets.map((slot) => {
    const samePositionMarkers = markersAtPosition[`${slot.targetOffset.x}:${slot.targetOffset.z}`];
    const samePositionIndex = samePositionMarkers.map((samePositionMarker) => samePositionMarker.id).indexOf(slot.id);
    const shouldSeparate = samePositionMarkers.length > 1;
    const angle = shouldSeparate ? -Math.PI / 2 + (Math.PI * 2 * samePositionIndex) / samePositionMarkers.length : 0;
    const offsetX = shouldSeparate ? Math.round(Math.cos(angle) * TARGET_OFFSET_MARKER_SPREAD_METERS * 100) / 100 : 0;
    const offsetZ = shouldSeparate ? Math.round(Math.sin(angle) * TARGET_OFFSET_MARKER_SPREAD_METERS * 100) / 100 : 0;

    return {
      slotId: slot.id,
      label: String(slot.id + 1),
      position: [slot.targetOffset.x + offsetX, 0, slot.targetOffset.z + offsetZ],
    };
  });
}
