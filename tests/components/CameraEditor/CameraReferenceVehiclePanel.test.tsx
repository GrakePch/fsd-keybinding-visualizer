import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraReferenceVehiclePanel from "../../../src/components/CameraEditor/CameraReferenceVehiclePanel";
import { getReferenceVehicles, resolveGroupVehicleContext } from "../../../src/utils/cameraVehicleBinding";

const props = {
  vehicles: getReferenceVehicles(null, []), loading: false, errors: [], hasManualBinding: false, isAutomaticSelection: false,
  automaticContext: resolveGroupVehicleContext({ binding: null, autoModel: null, seatCameraConfig: null, vehicles: [] }),
  onRestoreAutomaticBinding: () => {}, onChange: () => {}, onConfirm: () => {}, onCancel: () => {},
};
const applyButton = (markup: string) => markup.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*Apply vehicle<\/button>/)?.[0];

describe("reference vehicle selector", () => {
  it("requires explicit selection for ambiguous vehicle camera associations", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "MISC_Hull_A_PU_AI_CIV" }} />);
    expect(markup).toContain("Choose a camera configuration");
    expect(markup).toContain('value="MISC_Hull_A_ThirdPersonFlight"');
    expect(applyButton(markup)).toContain('disabled=""');
  });

  it("allows camera-only vehicles and shows asymmetric game ranges", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "ANVL_Carrack" }} />);
    expect(markup).toContain("No model available");
    expect(markup).toContain("85–220");
    expect(markup).toContain("Y -150…200");
    expect(applyButton(markup)).not.toContain('disabled=""');
  });

  it("allows missing camera data with explicit default range status", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={{ mode: "vehicle-context", vehicleId: "Missing" }} />);
    expect(markup).toContain("Defaults");
    expect(applyButton(markup)).not.toContain('disabled=""');
  });

  it("opens an accessible dialog and prevents applying without a selection", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} selection={null} />);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Search vehicle name or variant");
    expect(markup).toContain('aria-label="Search vehicles"');
    expect(markup).not.toContain("<span>Search vehicles</span>");
    expect(markup).not.toContain("Restore automatic association");
    expect(applyButton(markup)).toContain('disabled=""');
  });

  it("offers restoring automatic association for a manually assigned vehicle", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} hasManualBinding selection={{ mode: "vehicle-context", vehicleId: "ANVL_Carrack" }} />);
    expect(markup).toContain("Restore automatic association</button>");
  });

  it("allows applying automatic association even when the group has no automatic vehicle", () => {
    const markup = renderToStaticMarkup(<CameraReferenceVehiclePanel {...props} hasManualBinding isAutomaticSelection selection={null} />);
    expect(markup).toContain("Automatic association selected. Click Apply vehicle to apply.");
    expect(markup).toContain('aria-pressed="true">Restore automatic association');
    expect(applyButton(markup)).not.toContain('disabled=""');
    expect(markup).not.toContain("Choose a camera configuration");
  });
});
