import type { SavedCameraSlot, Vec3 } from "../types/savedViews";
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

export function createSeatViewPresetSlots(): SavedCameraSlot[] {
  return SEAT_VIEW_PRESET_ROTATIONS.map((cameraRotationAngle, id) => ({
    ...createDefaultCameraSlot(id),
    type: "OrbitSCItemSeat",
    cameraRotationAngle: { ...cameraRotationAngle },
    distance: DEFAULT_SEAT_VIEW_PRESET_DISTANCE,
    targetOffset: { x: 0, y: 0, z: 0 },
    lensSize: 0,
    fStop: 11,
  }));
}

export function fillEmptySlotsWithSeatViewPreset(slots: SavedCameraSlot[]): SavedCameraSlot[] {
  const existingSlotIds = new Set(slots.map((slot) => slot.id));
  const missingPresetSlots = createSeatViewPresetSlots().filter((slot) => !existingSlotIds.has(slot.id));

  return [...slots, ...missingPresetSlots].sort((left, right) => left.id - right.id);
}

export function resetSlotsToSeatViewPreset(): SavedCameraSlot[] {
  return createSeatViewPresetSlots();
}
