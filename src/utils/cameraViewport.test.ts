import { describe, expect, it } from "vitest";
import { getCameraBoomDirection, getCameraFitFromBounds, getCameraPositionMarkers, getVehicleGridFromBounds, savedViewPositionToViewportPosition } from "./cameraViewport";

describe("getCameraFitFromBounds", () => {
  it("converts centimeter manifest bounds into meter-space camera fit", () => {
    const fit = getCameraFitFromBounds({
      center: [1000, 2000, 3000],
      size: [10000, 20000, 5000],
      radius: 12000,
    });

    expect(fit.target).toEqual([10, 20, 30]);
    expect(fit.cameraPosition[0]).toBeCloseTo(226);
    expect(fit.cameraPosition[1]).toBeCloseTo(680);
    expect(fit.cameraPosition[2]).toBeCloseTo(246);
    expect(fit.viewHeight).toBeCloseTo(336);
    expect(fit.near).toBe(0.01);
    expect(fit.far).toBe(2000);
  });

  it("falls back to a safe default when bounds are missing", () => {
    const fit = getCameraFitFromBounds(null);

    expect(fit.target).toEqual([0, 0, 0]);
    expect(fit.cameraPosition).toEqual([80, 240, 80]);
    expect(fit.viewHeight).toBe(240);
    expect(fit.near).toBe(0.01);
    expect(fit.far).toBe(2000);
  });
});

describe("getVehicleGridFromBounds", () => {
  it("places a one-meter X-Y grid below the Z-up model and sizes it from the larger horizontal bound", () => {
    const grid = getVehicleGridFromBounds({
      center: [1000, 2000, 3000],
      size: [10000, 20000, 5000],
      radius: 12000,
    });

    expect(grid).toEqual({
      center: [10, 20, 4],
      span: 220,
    });
  });

  it("covers long vehicles whose source forward axis is viewport y", () => {
    const grid = getVehicleGridFromBounds({
      center: [0, 0, 0],
      size: [2348.11865234375, 5069.072265625, 1331.482421875],
      radius: 2871.497888733335,
    });

    expect(grid?.center[0]).toBeCloseTo(0);
    expect(grid?.center[1]).toBeCloseTo(0);
    expect(grid?.center[2]).toBeCloseTo(-7.657412109375);
    expect(grid?.span).toBe(60);
  });

  it("does not render a vehicle grid without usable bounds", () => {
    expect(getVehicleGridFromBounds(null)).toBeNull();
    expect(getVehicleGridFromBounds({ center: [0, 0, 0], size: [0, 100, 100], radius: 100 })).toBeNull();
  });
});

describe("savedViewPositionToViewportPosition", () => {
  it("keeps Star Citizen saved-view coordinates in the Z-up viewport axes", () => {
    expect(savedViewPositionToViewportPosition({ x: 1, y: 2, z: 3 })).toEqual([1, 2, 3]);
  });
});

describe("getCameraBoomDirection", () => {
  it("uses the viewport -Y axis as the zero-rotation ship tail direction", () => {
    const direction = getCameraBoomDirection({ x: 0, y: 0, z: 0 });

    expect(direction[0]).toBeCloseTo(0);
    expect(direction[1]).toBeCloseTo(-1);
    expect(direction[2]).toBeCloseTo(0);
  });

  it("applies pitch around the horizontal boom direction", () => {
    const direction = getCameraBoomDirection({ x: -30, y: 0, z: 0 });

    expect(direction[0]).toBeCloseTo(0);
    expect(direction[1]).toBeCloseTo(-0.8660254);
    expect(direction[2]).toBeCloseTo(0.5);
  });

  it("applies yaw around the viewport Z-up axis", () => {
    const direction = getCameraBoomDirection({ x: 0, y: 0, z: 90 });

    expect(direction[0]).toBeCloseTo(-1);
    expect(direction[1]).toBeCloseTo(0);
    expect(direction[2]).toBeCloseTo(0);
  });
});

describe("getCameraPositionMarkers", () => {
  it("places the camera marker from target offset, rotation angle, and distance", () => {
    const markers = getCameraPositionMarkers([
      {
        id: 0,
        targetOffset: { x: 10, y: 20, z: 30 },
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        distance: 5,
      },
    ]);

    expect(markers).toEqual([
      {
        slotId: 0,
        label: "1",
        targetPosition: [10, 20, 30],
        cameraPosition: [10, 15, 30],
      },
    ]);
  });

  it("keeps overlapping targets and cameras at their true computed positions", () => {
    const markers = getCameraPositionMarkers([
      {
        id: 1,
        targetOffset: { x: 3, y: 10, z: -7 },
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        distance: 2,
      },
      {
        id: 2,
        targetOffset: { x: 3, y: 10, z: -7 },
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        distance: 2,
      },
    ]);

    expect(markers).toEqual([
      { slotId: 1, label: "2", targetPosition: [3, 10, -7], cameraPosition: [3, 8, -7] },
      { slotId: 2, label: "3", targetPosition: [3, 10, -7], cameraPosition: [3, 8, -7] },
    ]);
  });
});
