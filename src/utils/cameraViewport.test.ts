import { describe, expect, it } from "vitest";
import { getCameraFitFromBounds, getTargetOffsetMarkers } from "./cameraViewport";

describe("getCameraFitFromBounds", () => {
  it("uses manifest bounds to center and distance the preview camera", () => {
    const fit = getCameraFitFromBounds({
      center: [10, 20, 30],
      size: [100, 200, 50],
      radius: 120,
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

describe("getTargetOffsetMarkers", () => {
  it("maps camera target offsets into CSS2D meter-space marker positions with slot labels", () => {
    const markers = getTargetOffsetMarkers([
      { id: 0, targetOffset: { x: -10, y: 100, z: -5 } },
      { id: 4, targetOffset: { x: 0, y: 200, z: 0 } },
      { id: 8, targetOffset: { x: 10, y: 300, z: 5 } },
    ]);

    expect(markers).toEqual([
      { slotId: 0, label: "1", position: [-10, 0, -5] },
      { slotId: 4, label: "5", position: [0, 0, 0] },
      { slotId: 8, label: "9", position: [10, 0, 5] },
    ]);
  });

  it("separates markers in meter space when target offsets share the same x/z position", () => {
    const markers = getTargetOffsetMarkers([
      { id: 1, targetOffset: { x: 3, y: 10, z: -7 } },
      { id: 2, targetOffset: { x: 3, y: 20, z: -7 } },
    ]);

    expect(markers).toEqual([
      { slotId: 1, label: "2", position: [3, 0, -8.5] },
      { slotId: 2, label: "3", position: [3, 0, -5.5] },
    ]);
  });
});
