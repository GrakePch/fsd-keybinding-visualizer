import { describe, expect, it } from "vitest";
import { getCameraBoomDirection, getCameraFitFromBounds, getCameraPositionMarkers, savedViewPositionToViewportPosition } from "./cameraViewport";

describe("getCameraFitFromBounds", () => {
  it("converts centimeter manifest bounds into meter-space camera fit", () => {
    const fit = getCameraFitFromBounds({
      center: [1000, 2000, 3000],
      size: [10000, 20000, 5000],
      radius: 12000,
    });

    expect(fit.target).toEqual([10, 20, 30]);
    expect(fit.cameraPosition[0]).toBeCloseTo(10);
    expect(fit.cameraPosition[1]).toBeCloseTo(80);
    expect(fit.cameraPosition[2]).toBeCloseTo(318);
    expect(fit.near).toBeCloseTo(1.2);
    expect(fit.far).toBeCloseTo(1200);
  });

  it("falls back to a safe default when bounds are missing", () => {
    const fit = getCameraFitFromBounds(null);

    expect(fit.target).toEqual([0, 0, 0]);
    expect(fit.cameraPosition).toEqual([0, 60, 240]);
    expect(fit.near).toBe(0.1);
    expect(fit.far).toBe(2000);
  });
});

describe("savedViewPositionToViewportPosition", () => {
  it("maps Star Citizen saved-view coordinates to the Three.js viewport axes", () => {
    expect(savedViewPositionToViewportPosition({ x: 1, y: 2, z: 3 })).toEqual([1, 3, 2]);
  });
});

describe("getCameraBoomDirection", () => {
  it("uses the viewport +Z axis as the zero-rotation ship nose direction", () => {
    const direction = getCameraBoomDirection({ x: 0, y: 0, z: 0 });

    expect(direction[0]).toBeCloseTo(0);
    expect(direction[1]).toBeCloseTo(0);
    expect(direction[2]).toBeCloseTo(1);
  });

  it("applies pitch around the horizontal boom direction", () => {
    const direction = getCameraBoomDirection({ x: -30, y: 0, z: 0 });

    expect(direction[0]).toBeCloseTo(0);
    expect(direction[1]).toBeCloseTo(0.5);
    expect(direction[2]).toBeCloseTo(0.8660254);
  });

  it("applies yaw around the viewport up axis", () => {
    const direction = getCameraBoomDirection({ x: 0, y: 0, z: 90 });

    expect(direction[0]).toBeCloseTo(1);
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
        targetPosition: [10, 30, 20],
        cameraPosition: [10, 30, 25],
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
      { slotId: 1, label: "2", targetPosition: [3, -7, 10], cameraPosition: [3, -7, 12] },
      { slotId: 2, label: "3", targetPosition: [3, -7, 10], cameraPosition: [3, -7, 12] },
    ]);
  });
});
