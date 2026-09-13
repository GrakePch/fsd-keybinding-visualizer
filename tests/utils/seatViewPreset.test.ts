import { describe, expect, it } from "vitest";
import { createDefaultCameraSlot } from "../../src/utils/savedViews";
import { getCameraPositionMarkers } from "../../src/utils/cameraViewport";
import { createSeatViewPresetSlots, fillEmptySlotsWithSeatViewPreset, resetSlotsToSeatViewPreset } from "../../src/utils/seatViewPreset";
import type { ThirdPersonCameraBaseConfig } from "../../src/types/thirdPersonCamera";
import type { VehicleModelBounds } from "../../src/types/vehicleModel";

function cameraConfig(): ThirdPersonCameraBaseConfig {
  return {
    distanceConfig: { initialDistance: 14, minDistance: 12, maxDistance: 30 },
    targetOffsetConfig: {
      targetPositionOffset: { x: 0, y: 0, z: 0 },
      userTargetOffsetMin: { x: -100, y: -100, z: -100 },
      userTargetOffsetMax: { x: 100, y: 100, z: 100 },
    },
  };
}

function modelBounds(): VehicleModelBounds {
  return { center: [0, 0, 0], size: [1000, 2000, 300], radius: 1150 };
}

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

  it("uses the reference vehicle minimum distance and places the requested slots on model faces", () => {
    const slots = createSeatViewPresetSlots({ cameraConfig: cameraConfig(), modelBounds: modelBounds() });
    const markers = getCameraPositionMarkers(slots);
    const cameraPosition = (slotId: number) => markers.find((marker) => marker.slotId === slotId)!.cameraPosition;

    expect(slots.every((slot) => slot.distance === 12)).toBe(true);
    expect(cameraPosition(7)[0]).toBeCloseTo(0);
    expect(cameraPosition(7)[1]).toBeCloseTo(10);
    expect(cameraPosition(7)[2]).toBeCloseTo(0);
    expect(cameraPosition(1)[0]).toBeCloseTo(0);
    expect(cameraPosition(1)[1]).toBeCloseTo(-10);
    expect(cameraPosition(1)[2]).toBeCloseTo(0);
    expect(cameraPosition(3)[0]).toBeCloseTo(-5);
    expect(cameraPosition(3)[1]).toBeCloseTo(0);
    expect(cameraPosition(3)[2]).toBeCloseTo(0);
    expect(cameraPosition(5)[0]).toBeCloseTo(5);
    expect(cameraPosition(5)[1]).toBeCloseTo(0);
    expect(cameraPosition(5)[2]).toBeCloseTo(0);
    expect(cameraPosition(6)[2]).toBeCloseTo(1.5);
    expect(cameraPosition(0)[2]).toBeCloseTo(-1.5);
    expect(slots[2].targetOffset).toEqual({ x: 0, y: 0, z: 0 });
    expect(slots[8].targetOffset).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("clamps model-face target offsets to the reference vehicle target-offset box", () => {
    const config = cameraConfig();
    config.targetOffsetConfig.userTargetOffsetMin = { x: -2, y: -2, z: -2 };
    config.targetOffsetConfig.userTargetOffsetMax = { x: 2, y: 2, z: 2 };
    const slots = createSeatViewPresetSlots({ cameraConfig: config, modelBounds: modelBounds() });

    expect(slots[7].targetOffset).toEqual({ x: 0, y: 2, z: 0 });
    expect(slots[1].targetOffset).toEqual({ x: 0, y: -2, z: 0 });
    expect(slots[3].targetOffset).toEqual({ x: -2, y: 0, z: 0 });
    expect(slots[5].targetOffset).toEqual({ x: 2, y: 0, z: 0 });
  });
});
