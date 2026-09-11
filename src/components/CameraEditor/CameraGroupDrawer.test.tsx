import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraGroupDrawer from "./CameraGroupDrawer";
import { formatCameraGroupName, normalizeGroupSearchText } from "../../utils/cameraGroup";

describe("CameraGroupDrawer", () => {
  it("uses the same group display formatting and search normalization", () => {
    expect(formatCameraGroupName("Seat_AEGS_Avenger")).toBe("Seat AEGS Avenger");
    expect(normalizeGroupSearchText("AEGS_Avenger")).toBe(normalizeGroupSearchText("AEGS Avenger"));
  });

  it("renders group names with spaces while preserving the original id as the button title", () => {
    const markup = renderToStaticMarkup(
      <CameraGroupDrawer
        groups={[{ id: "AEGS_Avenger_Titan_View", slots: [], rawAttributes: {} }]}
        selectedGroupId="AEGS_Avenger_Titan_View"
        seats={[]}
        canAddGroup={true}
        onAddGroups={() => {}}
        onSelectGroup={() => {}}
      />,
    );

    expect(markup).toContain("AEGS Avenger Titan View");
    expect(markup).toContain("title=\"AEGS_Avenger_Titan_View\"");
  });

  it("marks groups that are linked to a vehicle", () => {
    const markup = renderToStaticMarkup(
      <CameraGroupDrawer
        groups={[{ id: "Seat (SCItem) - AEGS_Avenger_SCItem_Seat_Pilot", slots: [], rawAttributes: {} }]}
        selectedGroupId="Seat (SCItem) - AEGS_Avenger_SCItem_Seat_Pilot"
        seats={[]}
        canAddGroup={true}
        seatVehicleUsageByGroupId={{
          "Seat (SCItem) - AEGS_Avenger_SCItem_Seat_Pilot": { vehicleId: "AEGS_Avenger_Titan", displayName: "Avenger Titan", model: null },
        }}
        onAddGroups={() => {}}
        onSelectGroup={() => {}}
      />,
    );

    expect(markup).toContain("@ Avenger Titan");
  });
});
