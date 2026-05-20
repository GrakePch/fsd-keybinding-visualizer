import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mdiAlert, mdiAlertCircle, mdiCheckCircle, mdiInformation } from "@mdi/js";
import { getCameraRangeNoteIconPath, isCameraRangeNoteDanger, isCameraRangeNoteWarning } from "./CameraRangeNoteIcon";
import CameraVector3Editor from "./CameraVector3Editor";

describe("CameraVector3Editor", () => {
  it("can render camera rotation as pitch, roll, and yaw labels", () => {
    const markup = renderToStaticMarkup(
      <CameraVector3Editor
        label="Rotation Angle"
        value={{ x: -15, y: 99, z: -45 }}
        fields={[
          { axis: "x", label: "Pitch" },
          { axis: "y", label: "Roll" },
          { axis: "z", label: "Yaw" },
        ]}
        onChange={() => {}}
      />,
    );

    expect(markup).toContain("Pitch");
    expect(markup).toContain("Roll");
    expect(markup).toContain("Yaw");
    expect(markup).toContain("value=\"99\"");
  });

  it("can render rotation angle fields as continuous one-decimal sliders with manual numeric inputs", () => {
    const markup = renderToStaticMarkup(
      <CameraVector3Editor
        label="Rotation Angle"
        value={{ x: -15.24, y: 99.96, z: 240 }}
        fields={[
          { axis: "x", label: "Pitch" },
          { axis: "y", label: "Roll" },
          { axis: "z", label: "Yaw" },
        ]}
        variant="angleSlider"
        onChange={() => {}}
      />,
    );

    expect(markup).toContain("type=\"range\"");
    expect(markup).toContain("type=\"number\"");
    expect(markup).toContain("aria-label=\"Pitch angle\"");
    expect(markup).toMatch(/aria-label="Pitch angle" type="number" min="-85" max="70" step="0.1" value="-15.2"/);
    expect(markup).toMatch(/aria-label="Pitch" type="range" min="-85" max="70" step="0.1" value="-15.2"/);
    expect(markup).toMatch(/aria-label="Roll angle" type="number" min="-180" max="180" step="0.1" value="100.0"/);
    expect(markup).toMatch(/aria-label="Yaw angle" type="number" min="-180" max="180" step="0.1" value="180.0"/);
    expect(markup).toContain("step=\"0.1\"");
    expect(markup).not.toContain("-15.2°");
  });

  it("can render target offset fields as sliders with wider numeric input ranges", () => {
    const markup = renderToStaticMarkup(
      <CameraVector3Editor
        label="Target Offset"
        value={{ x: 125, y: -20, z: 5 }}
        variant="rangeSlider"
        ranges={{
          x: { recommended: { min: -100, max: 100 }, slider: { min: -100, max: 125 }, input: { min: -200, max: 200 }, isCurrentValueOutsideRecommendedRange: true },
          y: { recommended: { min: -100, max: 100 }, slider: { min: -100, max: 100 }, input: { min: -200, max: 200 }, isCurrentValueOutsideRecommendedRange: false },
          z: { recommended: { min: -60, max: 60 }, slider: { min: -60, max: 60 }, input: { min: -120, max: 120 }, isCurrentValueOutsideRecommendedRange: false },
        }}
        rangeNotes={{ x: "This range is estimated from model size.\nCurrent value is outside the range.", y: "This range is estimated from model size.", z: "This range is estimated from model size." }}
        onChange={() => {}}
      />,
    );

    expect(markup).toContain("This range is estimated from model size.");
    expect(markup).toContain("Current value is outside the range.");
    expect(markup).toMatch(/aria-label="X value" type="number" min="-200" max="200" step="0.1" value="125.0"/);
    expect(markup).toMatch(/aria-label="X" type="range" min="-100" max="125" step="0.1" value="125"/);
    expect(markup).toMatch(/aria-label="Z value" type="number" min="-120" max="120" step="0.1" value="5.0"/);
  });

  it("maps range note text to status-specific icons", () => {
    expect(getCameraRangeNoteIconPath("This range is tested in game.")).toBe(mdiCheckCircle);
    expect(getCameraRangeNoteIconPath("This range is estimated from model size.")).toBe(mdiInformation);
    expect(getCameraRangeNoteIconPath("This range uses default values.")).toBe(mdiInformation);
    expect(getCameraRangeNoteIconPath("This range is tested in game.\nCurrent value is outside the range.")).toBe(mdiAlert);
    expect(getCameraRangeNoteIconPath("This range is estimated from model size.\nCurrent value is outside the range.")).toBe(mdiAlertCircle);
    expect(getCameraRangeNoteIconPath("This range uses default values.\nCurrent value is outside the range.")).toBe(mdiAlertCircle);
  });

  it("treats outside range notes as warning states", () => {
    expect(isCameraRangeNoteWarning("This range is tested in game.")).toBe(false);
    expect(isCameraRangeNoteWarning("This range is estimated from model size.")).toBe(false);
    expect(isCameraRangeNoteWarning("This range uses default values.")).toBe(false);
    expect(isCameraRangeNoteWarning("This range is tested in game.\nCurrent value is outside the range.")).toBe(true);
    expect(isCameraRangeNoteWarning("This range is estimated from model size.\nCurrent value is outside the range.")).toBe(true);
    expect(isCameraRangeNoteWarning("This range uses default values.\nCurrent value is outside the range.")).toBe(true);
  });

  it("treats tested outside range notes as danger states", () => {
    expect(isCameraRangeNoteDanger("This range is tested in game.")).toBe(false);
    expect(isCameraRangeNoteDanger("This range is estimated from model size.\nCurrent value is outside the range.")).toBe(false);
    expect(isCameraRangeNoteDanger("This range uses default values.\nCurrent value is outside the range.")).toBe(false);
    expect(isCameraRangeNoteDanger("This range is tested in game.\nCurrent value is outside the range.")).toBe(true);
  });
});
