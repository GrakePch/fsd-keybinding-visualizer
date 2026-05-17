import { describe, expect, it } from "vitest";
import { getCameraBoomDirection, getCameraFitFromBounds, getCameraPositionMarkers, getCameraRotationUpVector, getTargetOffsetBoundingBox, getTargetOffsetBoundingBoxEdgePoints, getVehicleGridFromTargetOffsetBoundingBox, getVehicleGridLineValues, savedViewPositionToViewportPosition } from "./cameraViewport";

describe("getCameraFitFromBounds", () => {
  it("converts centimeter manifest bounds into meter-space camera fit", () => {
    const fit = getCameraFitFromBounds(
      {
        center: [1000, 2000, 3000],
        size: [10000, 20000, 5000],
        radius: 12000,
      },
      { maxCameraMarkerDistance: 170 },
    );

    const cameraOffset = [
      fit.cameraPosition[0] - fit.target[0],
      fit.cameraPosition[1] - fit.target[1],
      fit.cameraPosition[2] - fit.target[2],
    ];
    const cameraDistance = Math.sqrt(cameraOffset[0] * cameraOffset[0] + cameraOffset[1] * cameraOffset[1] + cameraOffset[2] * cameraOffset[2]);

    expect(fit.target).toEqual([10, 20, 30]);
    expect(cameraDistance).toBeCloseTo(Math.sqrt(100 * 100 + 200 * 200 + 50 * 50) / 2 + 170 + 1.01);
    expect(cameraOffset[0] / cameraOffset[1]).toBeCloseTo(1.8 / 5.5);
    expect(cameraOffset[2] / cameraOffset[1]).toBeCloseTo(1.8 / 5.5);
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

describe("getVehicleGridFromTargetOffsetBoundingBox", () => {
  it("places the grid on the bounding box bottom and extends to the bounding box edges", () => {
    const grid = getVehicleGridFromTargetOffsetBoundingBox({
      min: [-30, -25, -15],
      max: [30, 25, 15],
    });

    expect(grid).toEqual({
      min: [-30, -25, -15],
      max: [30, 25, -15],
    });
  });

  it("does not render a vehicle grid with unusable bounds", () => {
    expect(getVehicleGridFromTargetOffsetBoundingBox({ min: [0, -1, 0], max: [0, 1, 2] })).toBeNull();
  });
});

describe("getVehicleGridLineValues", () => {
  it("uses ten-meter spacing from the center axis and stops at bounding edges", () => {
    expect(getVehicleGridLineValues(-2, 23)).toEqual([-2, 0, 10, 20, 23]);
  });

  it("extends in both directions from the center axis", () => {
    expect(getVehicleGridLineValues(-25, 25)).toEqual([-25, -20, -10, 0, 10, 20, 25]);
  });

  it("does not duplicate the center axis or max edge when spacing lands exactly on it", () => {
    expect(getVehicleGridLineValues(-10, 20)).toEqual([-10, 0, 10, 20]);
  });
});

describe("getTargetOffsetBoundingBox", () => {
  it("builds a viewport-space box from target-offset recommended ranges", () => {
    expect(
      getTargetOffsetBoundingBox({
        x: { min: -30, max: 30 },
        y: { min: -25, max: 25 },
        z: { min: -15, max: 15 },
      }),
    ).toEqual({
      min: [-30, -25, -15],
      max: [30, 25, 15],
    });
  });

  it("skips unusable target-offset ranges", () => {
    expect(
      getTargetOffsetBoundingBox({
        x: { min: -30, max: -30 },
        y: { min: -25, max: 25 },
        z: { min: -15, max: 15 },
      }),
    ).toBeNull();
  });
});

describe("getTargetOffsetBoundingBoxEdgePoints", () => {
  it("returns twelve edge line segments for the target-offset box", () => {
    const points = getTargetOffsetBoundingBoxEdgePoints({ min: [-1, -2, -3], max: [4, 5, 6] });

    expect(points).toHaveLength(24);
    expect(points.slice(0, 8)).toEqual([
      [-1, -2, -3],
      [4, -2, -3],
      [4, -2, -3],
      [4, 5, -3],
      [4, 5, -3],
      [-1, 5, -3],
      [-1, 5, -3],
      [-1, -2, -3],
    ]);
    expect(points.slice(16)).toEqual([
      [-1, -2, -3],
      [-1, -2, 6],
      [4, -2, -3],
      [4, -2, 6],
      [4, 5, -3],
      [4, 5, 6],
      [-1, 5, -3],
      [-1, 5, 6],
    ]);
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
