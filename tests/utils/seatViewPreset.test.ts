import { describe, expect, it } from "vitest";
import { createDefaultCameraSlot } from "../../src/utils/savedViews";
import { createSeatViewPresetSlots, fillEmptySlotsWithSeatViewPreset, resetSlotsToSeatViewPreset } from "../../src/utils/seatViewPreset";

describe("seat view preset", () => {
  it("creates the nine reference slots without deduplicating repeated views", () => {
    const slots = createSeatViewPresetSlots();

    expect(slots).toHaveLength(9);
    expect(slots.map((slot) => slot.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(slots[0].cameraRotationAngle).toEqual({ x: -85, y: 0, z: 0 });
    expect(slots[6].cameraRotationAngle).toEqual(slots[2].cameraRotationAngle);
    expect(slots[7].cameraRotationAngle).toEqual(slots[4].cameraRotationAngle);
    expect(slots[8].cameraRotationAngle).toEqual(slots[0].cameraRotationAngle);
    expect(slots.every((slot) => slot.type === "OrbitSCItemSeat" && slot.distance === 8 && slot.lensSize === 0 && slot.fStop === 11)).toBe(true);
  });

  it("fills only missing preset slot ids and preserves existing slots", () => {
    const existingSlot = { ...createDefaultCameraSlot(4), distance: 37 };
    const slots = fillEmptySlotsWithSeatViewPreset([existingSlot]);

    expect(slots).toHaveLength(9);
    expect(slots.find((slot) => slot.id === 4)?.distance).toBe(37);
    expect(slots.map((slot) => slot.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("resets all slots to the reference preset", () => {
    const slots = resetSlotsToSeatViewPreset();

    expect(slots.map((slot) => slot.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(slots.every((slot) => slot.distance === 8)).toBe(true);
  });
});
