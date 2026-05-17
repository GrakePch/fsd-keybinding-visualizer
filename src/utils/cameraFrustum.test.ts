import { describe, expect, it } from "vitest";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, CAMERA_LENS_VERTICAL_FOV_DEGREES, DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, DEFAULT_CAMERA_LENS_SIZE, getCameraFrustumAspectRatio, getCameraFrustumLineSegments, getCameraLensVerticalFov, getContainedCameraViewVerticalFov, normalizeCameraLensSize } from "./cameraFrustum";

describe("camera frustum aspect ratio configuration", () => {
  it("offers common desktop monitor aspect ratios with 16:9 as the default", () => {
    expect(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID).toBe("16:9");
    expect(CAMERA_FRUSTUM_ASPECT_RATIOS.map((option) => [option.id, option.label, option.value])).toEqual([
      ["4:3", "4:3", 4 / 3],
      ["16:10", "16:10", 16 / 10],
      ["16:9", "16:9", 16 / 9],
      ["21:9", "21:9", 21 / 9],
      ["32:9", "32:9", 32 / 9],
    ]);
  });

  it("falls back to the default aspect ratio for unknown ids", () => {
    expect(getCameraFrustumAspectRatio("missing")).toBe(16 / 9);
  });
});

describe("camera lens size FOV mapping", () => {
  it("maps discrete lens size values to vertical FOV degrees", () => {
    expect(CAMERA_LENS_VERTICAL_FOV_DEGREES).toEqual([80, 70, 58, 51, 45, 41, 35, 30, 28, 24, 22, 19, 15, 12, 10]);
    expect(getCameraLensVerticalFov(0)).toBe(80);
    expect(getCameraLensVerticalFov(7)).toBe(30);
    expect(getCameraLensVerticalFov(14)).toBe(10);
  });

  it("normalizes lens size to a 0-14 integer slider range", () => {
    expect(normalizeCameraLensSize(-1)).toBe(0);
    expect(normalizeCameraLensSize(6.6)).toBe(7);
    expect(normalizeCameraLensSize(20)).toBe(14);
    expect(normalizeCameraLensSize(Number.NaN)).toBe(DEFAULT_CAMERA_LENS_SIZE);
  });
});

describe("camera view contained FOV", () => {
  it("keeps the saved vertical FOV when the viewport is at least as wide as the selected screen aspect", () => {
    expect(getContainedCameraViewVerticalFov(getCameraLensVerticalFov(0), 16 / 9, 21 / 9)).toBe(getCameraLensVerticalFov(0));
  });

  it("widens the vertical FOV when the selected screen aspect is wider than the viewport", () => {
    const baseFov = getCameraLensVerticalFov(0);
    const containedFov = getContainedCameraViewVerticalFov(baseFov, 16 / 9, 4 / 3);
    const expected = (Math.atan(Math.tan((baseFov * Math.PI) / 360) * ((16 / 9) / (4 / 3))) * 360) / Math.PI;

    expect(containedFov).toBeGreaterThan(baseFov);
    expect(containedFov).toBeCloseTo(expected);
  });
});
describe("getCameraFrustumLineSegments", () => {
  it("builds a vertical-FOV frustum whose width changes with the selected aspect ratio", () => {
    const halfHeight = Math.tan((80 * Math.PI) / 360) * 4;
    const halfWidth = halfHeight * (16 / 9);
    const segments = getCameraFrustumLineSegments(
      {
        cameraPosition: [0, -10, 0],
        targetPosition: [0, 0, 0],
        lensSize: 0,
        fStop: 4,
      },
      16 / 9,
    );

    expect(segments).toHaveLength(8);
    expect(segments[0].to[0]).toBeCloseTo(-halfWidth);
    expect(segments[0].to[1]).toBeCloseTo(-6);
    expect(segments[0].to[2]).toBeCloseTo(halfHeight);
    expect(segments[1].to[0]).toBeCloseTo(halfWidth);
    expect(segments[2].to[2]).toBeCloseTo(-halfHeight);
  });

  it("rotates the frustum plane around the camera view direction from roll", () => {
    const halfHeight = Math.tan((80 * Math.PI) / 360) * 4;
    const halfWidth = halfHeight * (16 / 9);
    const segments = getCameraFrustumLineSegments(
      {
        cameraPosition: [0, -10, 0],
        targetPosition: [0, 0, 0],
        cameraRotationAngle: { x: 0, y: 90, z: 0 },
        lensSize: 0,
        fStop: 4,
      },
      16 / 9,
    );

    expect(segments[0].to[0]).toBeCloseTo(halfHeight);
    expect(segments[0].to[1]).toBeCloseTo(-6);
    expect(segments[0].to[2]).toBeCloseTo(halfWidth);
    expect(segments[1].to[0]).toBeCloseTo(halfHeight);
    expect(segments[1].to[2]).toBeCloseTo(-halfWidth);
    expect(segments[2].to[0]).toBeCloseTo(-halfHeight);
  });

  it("uses the full y then local x then world z saved rotation order for the frustum plane", () => {
    const segments = getCameraFrustumLineSegments(
      {
        cameraPosition: [7.5, -4.33012702, -5],
        targetPosition: [0, 0, 0],
        cameraRotationAngle: { x: 30, y: 45, z: 60 },
        lensSize: 0,
        fStop: 4,
      },
      16 / 9,
    );

    expect(segments[0].to[0]).toBeCloseTo(5.927446404);
    expect(segments[0].to[1]).toBeCloseTo(-6.449817193);
    expect(segments[0].to[2]).toBeCloseTo(2.476875144);
    expect(segments[1].to[0]).toBeCloseTo(7.431323009);
    expect(segments[1].to[1]).toBeCloseTo(3.522434129);
    expect(segments[1].to[2]).toBeCloseTo(-3.903532928);
  });

  it("returns no frustum lines when the camera and target overlap", () => {
    expect(getCameraFrustumLineSegments({ cameraPosition: [1, 2, 3], targetPosition: [1, 2, 3], lensSize: 0, fStop: 4 }, 16 / 9)).toEqual([]);
  });
});
