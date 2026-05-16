import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
});
