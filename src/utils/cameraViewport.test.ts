import { describe, expect, it } from "vitest";
import { getCameraBoomDirection, getCameraFitFromBounds, getCameraPositionMarkers, getCameraRotationUpVector, getVehicleGridFromBounds, savedViewPositionToViewportPosition } from "./cameraViewport";

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
  it("places a five-meter X-Y grid below the Z-up model and sizes it from the larger horizontal bound", () => {
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

  it("rounds grid span up to an even number of cells per side", () => {
    const grid = getVehicleGridFromBounds({
      center: [0, 0, 0],
      size: [5000, 1000, 1000],
      radius: 3000,
    });

    expect(grid?.span).toBe(60);
    expect(grid ? grid.span / 5 : 0).toBe(12);
  });

  it("uses a centered twelve-cell grid through the origin when no model bounds are loaded", () => {
    expect(getVehicleGridFromBounds(null)).toEqual({
      center: [0, 0, 0],
      span: 60,
    });
  });

  it("does not render a vehicle grid with unusable bounds", () => {
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

  it("treats negative yaw as clockwise around the viewport Z-up axis", () => {
    const direction = getCameraBoomDirection({ x: 0, y: 0, z: -90 });

    expect(direction[0]).toBeCloseTo(-1);
    expect(direction[1]).toBeCloseTo(0);
    expect(direction[2]).toBeCloseTo(0);
  });

  it("applies saved rotations in y then local x then world z order", () => {
    const direction = getCameraBoomDirection({ x: 30, y: 45, z: 60 });

    expect(direction[0]).toBeCloseTo(0.573223305);
    expect(direction[1]).toBeCloseTo(-0.73919892);
    expect(direction[2]).toBeCloseTo(-0.353553391);
  });
});

describe("getCameraRotationUpVector", () => {
  it("applies saved rotations to camera up in y then local x then world z order", () => {
    const up = getCameraRotationUpVector({ x: 30, y: 45, z: 60 });

    expect(up[0]).toBeCloseTo(0.73919892);
    expect(up[1]).toBeCloseTo(0.280330086);
    expect(up[2]).toBeCloseTo(0.612372436);
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
        lensSize: 14,
        fStop: 11,
      },
    ]);

    expect(markers).toEqual([
      {
        slotId: 0,
        label: "1",
        targetPosition: [10, 20, 30],
        cameraPosition: [10, 15, 30],
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        lensSize: 14,
        fStop: 11,
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
        lensSize: 14,
        fStop: 11,
      },
      {
        id: 2,
        targetOffset: { x: 3, y: 10, z: -7 },
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        distance: 2,
        lensSize: 14,
        fStop: 11,
      },
    ]);

    expect(markers).toEqual([
      { slotId: 1, label: "2", targetPosition: [3, 10, -7], cameraPosition: [3, 8, -7], cameraRotationAngle: { x: 0, y: 0, z: 0 }, lensSize: 14, fStop: 11 },
      { slotId: 2, label: "3", targetPosition: [3, 10, -7], cameraPosition: [3, 8, -7], cameraRotationAngle: { x: 0, y: 0, z: 0 }, lensSize: 14, fStop: 11 },
    ]);
  });

  it("clamps rendered distance to the optional minimum without changing other marker data", () => {
    const markers = getCameraPositionMarkers(
      [
        {
          id: 0,
          targetOffset: { x: 10, y: 20, z: 30 },
          cameraRotationAngle: { x: 0, y: 0, z: 0 },
          distance: 5,
          lensSize: 14,
          fStop: 11,
        },
      ],
      { minimumDistance: 8 },
    );

    expect(markers).toEqual([
      {
        slotId: 0,
        label: "1",
        targetPosition: [10, 20, 30],
        cameraPosition: [10, 12, 30],
        cameraRotationAngle: { x: 0, y: 0, z: 0 },
        lensSize: 14,
        fStop: 11,
      },
    ]);
  });

  it("does not clamp rendered distance above the optional minimum", () => {
    const markers = getCameraPositionMarkers(
      [
        {
          id: 0,
          targetOffset: { x: 10, y: 20, z: 30 },
          cameraRotationAngle: { x: 0, y: 0, z: 0 },
          distance: 12,
          lensSize: 14,
          fStop: 11,
        },
      ],
      { minimumDistance: 8 },
    );

    expect(markers[0].cameraPosition).toEqual([10, 8, 30]);
  });
});
