import { describe, expect, it } from "vitest";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, getCameraFrustumAspectRatio, getCameraFrustumLineSegments } from "./cameraFrustum";

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

describe("getCameraFrustumLineSegments", () => {
  it("builds a vertical-FOV frustum whose width changes with the selected aspect ratio", () => {
    const halfHeight = Math.tan((85 * Math.PI) / 360) * 4;
    const halfWidth = halfHeight * (16 / 9);
    const segments = getCameraFrustumLineSegments(
      {
        cameraPosition: [0, -10, 0],
        targetPosition: [0, 0, 0],
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

  it("returns no frustum lines when the camera and target overlap", () => {
    expect(getCameraFrustumLineSegments({ cameraPosition: [1, 2, 3], targetPosition: [1, 2, 3], fStop: 4 }, 16 / 9)).toEqual([]);
  });
});
