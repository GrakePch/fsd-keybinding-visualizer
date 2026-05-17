import { describe, expect, it } from "vitest";
import { getModelLoadProgressPercent, shouldRenderCameraModelViewer, shouldShowViewportModelInfo } from "./cameraModelOverlay";

describe("camera model overlay", () => {
  it("hides viewport model info once a renderable model is selected", () => {
    expect(shouldShowViewportModelInfo({ hasModel: true, hasRenderableModel: true })).toBe(false);
  });

  it("keeps viewport model info visible for metadata-only model selections", () => {
    expect(shouldShowViewportModelInfo({ hasModel: true, hasRenderableModel: false })).toBe(true);
  });

  it("renders the viewport canvas when camera markers exist even without a loaded model", () => {
    expect(shouldRenderCameraModelViewer()).toBe(true);
  });

  it("renders the viewport canvas for a renderable model even without markers", () => {
    expect(shouldRenderCameraModelViewer()).toBe(true);
  });

  it("keeps the viewport canvas visible for the default origin grid", () => {
    expect(shouldRenderCameraModelViewer()).toBe(true);
  });

  it("normalizes finite model load progress to whole percentages", () => {
    expect(getModelLoadProgressPercent({ loaded: 25, total: 100, lengthComputable: true })).toBe(25);
    expect(getModelLoadProgressPercent({ loaded: 25.5, total: 100, lengthComputable: true })).toBe(26);
  });

  it("returns null when model load progress cannot be computed", () => {
    expect(getModelLoadProgressPercent({ loaded: 25, total: 0, lengthComputable: true })).toBeNull();
    expect(getModelLoadProgressPercent({ loaded: 25, total: 100, lengthComputable: false })).toBeNull();
  });
});
