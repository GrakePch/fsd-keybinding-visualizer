import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraGroupDrawer from "../../../src/components/CameraEditor/CameraGroupDrawer";
import { formatCameraGroupName, getVisibleCameraGroups, normalizeGroupSearchText } from "../../../src/utils/cameraGroup";

describe("CameraGroupDrawer", () => {
  it("uses the same group display formatting and search normalization", () => {
    expect(formatCameraGroupName("Seat_AEGS_Avenger")).toBe("Seat AEGS Avenger");
    expect(normalizeGroupSearchText("AEGS_Avenger")).toBe(normalizeGroupSearchText("AEGS Avenger"));
  });

  it("filters groups and keeps Player On Foot first before sorting alphabetically", () => {
    const groups = [
      { id: "Zeta", slots: [], rawAttributes: {} },
      { id: "Alpha_View", slots: [], rawAttributes: {} },
      { id: "Player On Foot", slots: [], rawAttributes: {} },
    ];

    expect(getVisibleCameraGroups(groups, "view").map((group) => group.id)).toEqual(["Alpha_View"]);
    expect(getVisibleCameraGroups(groups, "").map((group) => group.id)).toEqual(["Player On Foot", "Alpha_View", "Zeta"]);
    expect(groups.map((group) => group.id)).toEqual(["Zeta", "Alpha_View", "Player On Foot"]);
  });

  it("renders group names with spaces while preserving the original id as the button title", () => {
    const markup = renderToStaticMarkup(
      <CameraGroupDrawer
        groups={[{ id: "AEGS_Avenger_Titan_View", slots: [], rawAttributes: {} }]}
        selectedGroupId="AEGS_Avenger_Titan_View"
        seats={[]}
        canAddGroup={true}
        onAddGroups={() => {}}
        onDeleteGroup={() => {}}
        onSelectGroup={() => {}}
        onSetAllEmptyToPreset={() => {}}
        onResetAllGroupsToPreset={() => {}}
      />,
    );

    expect(markup).toContain("AEGS Avenger Titan View");
    expect(markup).toContain("title=\"AEGS_Avenger_Titan_View\"");
    expect(markup).toContain("aria-label=\"Delete AEGS Avenger Titan View\"");
    expect(markup).toContain("placeholder=\"Search by group name\"");
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
        onDeleteGroup={() => {}}
        onSelectGroup={() => {}}
        onSetAllEmptyToPreset={() => {}}
        onResetAllGroupsToPreset={() => {}}
      />,
    );

    expect(markup).toContain("@ Avenger Titan");
  });
});
