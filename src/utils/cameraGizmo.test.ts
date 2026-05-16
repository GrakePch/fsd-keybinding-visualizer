import { describe, expect, it } from "vitest";
import { CAMERA_GIZMO_AXIS_COLORS, CAMERA_GIZMO_LABEL_COLOR, CAMERA_GIZMO_LAYOUT } from "./cameraGizmo";

describe("camera viewport gizmo configuration", () => {
  it("places the orientation gizmo in the lower-right viewport corner", () => {
    expect(CAMERA_GIZMO_LAYOUT).toEqual({ alignment: "bottom-right", margin: [64, 64] });
  });

  it("uses the camera editor Z-up axis color convention", () => {
    expect(CAMERA_GIZMO_AXIS_COLORS).toEqual(["#ff6b6b", "#6bff95", "#5da9ff"]);
    expect(CAMERA_GIZMO_LABEL_COLOR).toBe("#0b1020");
  });
});
