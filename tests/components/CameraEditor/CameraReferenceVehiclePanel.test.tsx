import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraReferenceVehiclePanel from "../../../src/components/CameraEditor/CameraReferenceVehiclePanel";
import { getReferenceVehicles } from "../../../src/utils/cameraVehicleBinding";

const props = { vehicles: getReferenceVehicles(null, []), loading: false, errors: [], onChange: () => {}, onConfirm: () => {}, onCancel: () => {} };

describe("reference vehicle selector", () => {
  it("requires explicit selection for ambiguous vehicle camera associations", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "MISC_Hull_A_PU_AI_CIV" }} />);
    expect(markup).toContain("Choose a camera configuration");
    expect(markup).toContain('value="MISC_Hull_A_ThirdPersonFlight"');
    expect(markup).toMatch(/disabled="">Apply vehicle/);
  });

  it("allows camera-only vehicles and shows asymmetric game ranges", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "ANVL_Carrack" }} />);
    expect(markup).toContain("No model available");
    expect(markup).toContain("85–220");
    expect(markup).toContain("Y -150…200");
    expect(markup).not.toMatch(/disabled="">Apply vehicle/);
  });

  it("allows missing camera data with explicit default range status", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "Missing" }} />);
    expect(markup).toContain("Defaults");
    expect(markup).not.toMatch(/disabled="">Apply vehicle/);
  });
});
