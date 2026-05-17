import { describe, expect, it } from "vitest";
import { getCameraControlRanges } from "./cameraControlRanges";
import type { VehicleModelBounds } from "../types/vehicleModel";

function bounds(sizeMeters: [number, number, number]): VehicleModelBounds {
  return {
    center: [0, 0, 0],
    size: sizeMeters.map((value) => value * 100) as [number, number, number],
    radius: Math.max(...sizeMeters) * 50,
  };
}

describe("getCameraControlRanges", () => {
  it("uses precise Pisces ranges from class prefix overrides", () => {
    const ranges = getCameraControlRanges({ className: "ANVL_C8X_Pisces_Expedition", bounds: bounds([10, 13, 3.25]) });

    expect(ranges.source).toBe("precise");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -30, max: 30 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -25, max: 25 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -15, max: 15 });
    expect(ranges.distance.slider).toEqual({ min: 8, max: 25 });
  });

  it("uses the longest matching precise class prefix", () => {
    const ranges = getCameraControlRanges({ className: "CRUS_Starlifter_C2", bounds: bounds([70, 94, 23]) });

    expect(ranges.source).toBe("precise");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 60 });
    expect(ranges.distance.slider).toEqual({ min: 55, max: 170 });
  });

  it("infers medium ship ranges from model bounds size when no override matches", () => {
    const ranges = getCameraControlRanges({ className: "MISC_Freelancer", bounds: bounds([35, 45, 9]) });

    expect(ranges.source).toBe("inferred");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 60 });
    expect(ranges.distance.slider).toEqual({ min: 25, max: 170 });
  });

  it("falls back to safe default ranges without usable bounds", () => {
    const ranges = getCameraControlRanges({ className: undefined, bounds: null });

    expect(ranges.source).toBe("default");
    expect(ranges.targetOffset.x.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.y.slider).toEqual({ min: -100, max: 100 });
    expect(ranges.targetOffset.z.slider).toEqual({ min: -60, max: 60 });
    expect(ranges.distance.slider).toEqual({ min: 0, max: 170 });
  });

  it("keeps wider input ranges for inferred values", () => {
    const ranges = getCameraControlRanges({ className: "MISC_Freelancer", bounds: bounds([35, 45, 9]) });

    expect(ranges.targetOffset.x.input).toEqual({ min: -200, max: 200 });
    expect(ranges.targetOffset.y.input).toEqual({ min: -200, max: 200 });
    expect(ranges.targetOffset.z.input).toEqual({ min: -120, max: 120 });
    expect(ranges.distance.input).toEqual({ min: 0, max: 340 });
  });

  it("expands slider ranges to include current slot values without clamping them", () => {
    const ranges = getCameraControlRanges({
      className: "MISC_Freelancer",
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
      className: "MISC_Freelancer",
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
