import { describe, expect, it } from "vitest";
import { getCameraFitFromBounds } from "./cameraViewport";

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
