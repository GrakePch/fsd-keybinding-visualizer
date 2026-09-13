import type { SavedCameraSlot, Vec3 } from "../types/savedViews";
import type { ThirdPersonCameraBaseConfig } from "../types/thirdPersonCamera";
import type { VehicleModelBounds } from "../types/vehicleModel";
import { getCameraControlRanges } from "./cameraControlRanges";
import { getCameraBoomDirection } from "./cameraViewport";
import { createDefaultCameraSlot } from "./savedViews";

export const SEAT_VIEW_PRESET_SLOT_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const DEFAULT_SEAT_VIEW_PRESET_DISTANCE = 8;

const SEAT_VIEW_PRESET_ROTATIONS: Vec3[] = [
  { x: -85, y: 0, z: 0 },
  { x: 0, y: 0, z: 180 },
  { x: -85, y: 180, z: 0 },
  { x: 0, y: 0, z: 90 },
  { x: 0, y: 0, z: 0 },
  { x: 0, y: 0, z: -90 },
  { x: -85, y: 180, z: 0 },
  { x: 0, y: 0, z: 0 },
  { x: -85, y: 0, z: 0 },
];

export type SeatViewPresetContext = {
  cameraConfig?: ThirdPersonCameraBaseConfig | null;
  modelBounds?: VehicleModelBounds | null;
};

type PresetFace = {
  axis: keyof Vec3;
  direction: 1 | -1;
};

const PRESET_FACES: Partial<Record<number, PresetFace>> = {
  0: { axis: "z", direction: -1 },
  1: { axis: "y", direction: -1 },
  3: { axis: "x", direction: -1 },
  5: { axis: "x", direction: 1 },
  6: { axis: "z", direction: 1 },
  7: { axis: "y", direction: 1 },
};

const MODEL_SOURCE_UNITS_TO_METERS = 0.01;

export function createSeatViewPresetSlots(context: SeatViewPresetContext = {}): SavedCameraSlot[] {
  const distance = getPresetDistance(context.cameraConfig);
  const targetOffsetBounds = getPresetTargetOffsetBounds(context);

  return SEAT_VIEW_PRESET_ROTATIONS.map((cameraRotationAngle, id) => ({
    ...createDefaultCameraSlot(id),
    type: "OrbitSCItemSeat",
    cameraRotationAngle: { ...cameraRotationAngle },
    distance,
    targetOffset: getPresetTargetOffset(id, cameraRotationAngle, distance, context.modelBounds, targetOffsetBounds),
    lensSize: 0,
    fStop: 11,
  }));
}

export function fillEmptySlotsWithSeatViewPreset(slots: SavedCameraSlot[], context: SeatViewPresetContext = {}): SavedCameraSlot[] {
  const existingSlotIds = new Set(slots.map((slot) => slot.id));
  const missingPresetSlots = createSeatViewPresetSlots(context).filter((slot) => !existingSlotIds.has(slot.id));

  return [...slots, ...missingPresetSlots].sort((left, right) => left.id - right.id);
}

export function resetSlotsToSeatViewPreset(context: SeatViewPresetContext = {}): SavedCameraSlot[] {
  return createSeatViewPresetSlots(context);
}

function getPresetDistance(cameraConfig: ThirdPersonCameraBaseConfig | null | undefined) {
  const minDistance = cameraConfig?.distanceConfig.minDistance;
  return Number.isFinite(minDistance) && (minDistance as number) >= 0 ? (minDistance as number) : DEFAULT_SEAT_VIEW_PRESET_DISTANCE;
}

function getPresetTargetOffsetBounds(context: SeatViewPresetContext) {
  const ranges = getCameraControlRanges({ cameraConfig: context.cameraConfig, bounds: context.modelBounds });
  return {
    x: ranges.targetOffset.x.recommended,
    y: ranges.targetOffset.y.recommended,
    z: ranges.targetOffset.z.recommended,
  };
}

function getPresetTargetOffset(
  slotId: number,
  cameraRotationAngle: Vec3,
  distance: number,
  modelBounds: VehicleModelBounds | null | undefined,
  targetOffsetBounds: Record<keyof Vec3, { min: number; max: number }>,
): Vec3 {
  const face = PRESET_FACES[slotId];
  if (!face || !modelBounds || !hasUsableModelBounds(modelBounds)) {
    return { x: 0, y: 0, z: 0 };
  }

  const center = modelBounds.center.map((value) => value * MODEL_SOURCE_UNITS_TO_METERS) as [number, number, number];
  const halfSize = modelBounds.size.map((value) => (value * MODEL_SOURCE_UNITS_TO_METERS) / 2) as [number, number, number];
  const cameraPosition = [0, 0, 0] as [number, number, number];
  const axisIndex = face.axis === "x" ? 0 : face.axis === "y" ? 1 : 2;
  cameraPosition[axisIndex] = center[axisIndex] + face.direction * halfSize[axisIndex];

  const boomDirection = getCameraBoomDirection(cameraRotationAngle);
  const targetOffset = { x: 0, y: 0, z: 0 };
  targetOffset[face.axis] = cameraPosition[axisIndex] - boomDirection[axisIndex] * distance;

  return {
    x: normalizeNearZero(clamp(targetOffset.x, targetOffsetBounds.x)),
    y: normalizeNearZero(clamp(targetOffset.y, targetOffsetBounds.y)),
    z: normalizeNearZero(clamp(targetOffset.z, targetOffsetBounds.z)),
  };
}

function hasUsableModelBounds(bounds: VehicleModelBounds) {
  return bounds.center.every(Number.isFinite) && bounds.size.every((value) => Number.isFinite(value) && value > 0);
}

function clamp(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, value));
}

function normalizeNearZero(value: number) {
  return Math.abs(value) < 1e-9 ? 0 : value;
}
