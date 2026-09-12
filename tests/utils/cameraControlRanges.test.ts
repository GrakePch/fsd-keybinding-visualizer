import { describe, expect, it } from "vitest";
import { getCameraControlRanges } from "../../src/utils/cameraControlRanges";
import type { ThirdPersonCameraBaseConfig } from "../../src/types/thirdPersonCamera";
import type { VehicleModelBounds } from "../../src/types/vehicleModel";

function bounds(sizeMeters: [number, number, number]): VehicleModelBounds {
  return {
    center: [0, 0, 0],
    size: sizeMeters.map((value) => value * 100) as [number, number, number],
    radius: Math.max(...sizeMeters) * 50,
  };
}

function cameraConfig(
  min: [number, number, number],
  max: [number, number, number],
  distance: { initial: number; min: number; max: number },
): ThirdPersonCameraBaseConfig {
  return {
    distanceConfig: {
      initialDistance: distance.initial,
      minDistance: distance.min,
      maxDistance: distance.max,
    },
    targetOffsetConfig: {
      targetPositionOffset: { x: 0, y: 0, z: 0 },
      userTargetOffsetMin: { x: min[0], y: min[1], z: min[2] },
      userTargetOffsetMax: { x: max[0], y: max[1], z: max[2] },
    },
  };
}

describe("getCameraControlRanges", () => {
  it("uses real Pisces ranges from its DataCore camera config", () => {
    const ranges = getCameraControlRanges({
      cameraConfig: cameraConfig([-30, -25, -15], [30, 25, 15], { initial: 14, min: 8, max: 25 }),
      bounds: bounds([10, 13, 3.25]),
    });

    expect(ranges.source).toBe("datacore");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -30, max: 30 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -25, max: 25 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -15, max: 15 });
    expect(ranges.distance.slider).toEqual({ min: 8, max: 25 });
  });

  it("preserves asymmetric DataCore target-offset bounding boxes", () => {
    const ranges = getCameraControlRanges({
      cameraConfig: cameraConfig([-180, -150, -110], [180, 200, 85], { initial: 150, min: 85, max: 220 }),
      bounds: bounds([70, 94, 23]),
    });

    expect(ranges.source).toBe("datacore");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -180, max: 180 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -150, max: 200 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -110, max: 85 });
    expect(ranges.distance.slider).toEqual({ min: 85, max: 220 });
  });

  it("infers medium ship ranges from model bounds size when no override matches", () => {
    const ranges = getCameraControlRanges({ bounds: bounds([35, 45, 9]) });

    expect(ranges.source).toBe("inferred");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 60 });
    expect(ranges.distance.slider).toEqual({ min: 25, max: 170 });
  });

  it("falls back to safe default ranges without usable bounds", () => {
    const ranges = getCameraControlRanges({ bounds: null });

    expect(ranges.source).toBe("default");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 60 });
    expect(ranges.distance.slider).toEqual({ min: 0, max: 170 });
  });

  it("keeps wider input ranges for inferred values", () => {
    const ranges = getCameraControlRanges({ bounds: bounds([35, 45, 9]) });

    expect(ranges.targetOffset.x.input).toEqual({ min: -200, max: 200 });
    expect(ranges.targetOffset.y.input).toEqual({ min: -200, max: 200 });
    expect(ranges.targetOffset.z.input).toEqual({ min: -120, max: 120 });
    expect(ranges.distance.input).toEqual({ min: 0, max: 340 });
  });

  it("expands slider ranges to include current slot values without clamping them", () => {
    const ranges = getCameraControlRanges({
      bounds: bounds([35, 45, 9]),
      currentTargetOffset: { x: 250, y: -240, z: 130 },
      currentDistance: 400,
    });

    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 250 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -240, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 130 });
    expect(ranges.distance.slider).toEqual({ min: 25, max: 400 });
    expect(ranges.targetOffset.x.isCurrentValueOutsideRecommendedRange).toBe(true);
    expect(ranges.targetOffset.y.isCurrentValueOutsideRecommendedRange).toBe(true);
    expect(ranges.targetOffset.z.isCurrentValueOutsideRecommendedRange).toBe(true);
    expect(ranges.distance.isCurrentValueOutsideRecommendedRange).toBe(true);
    expect(ranges.hasCurrentValueOutsideRecommendedRange).toBe(true);
  });

  it("tracks out-of-range state per individual slider", () => {
    const ranges = getCameraControlRanges({
      bounds: bounds([35, 45, 9]),
      currentTargetOffset: { x: 125, y: 0, z: 0 },
      currentDistance: 30,
    });

    expect(ranges.targetOffset.x.isCurrentValueOutsideRecommendedRange).toBe(true);
    expect(ranges.targetOffset.y.isCurrentValueOutsideRecommendedRange).toBe(false);
    expect(ranges.targetOffset.z.isCurrentValueOutsideRecommendedRange).toBe(false);
    expect(ranges.distance.isCurrentValueOutsideRecommendedRange).toBe(false);
    expect(ranges.hasCurrentValueOutsideRecommendedRange).toBe(true);
  });
});
