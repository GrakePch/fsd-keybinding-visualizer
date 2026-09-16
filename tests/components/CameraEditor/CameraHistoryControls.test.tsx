import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraHistoryControls, { CameraHistoryModal } from "../../../src/components/CameraEditor/CameraHistoryControls";
import { createCameraHistory, type CameraHistoryState } from "../../../src/utils/cameraHistory";

describe("camera history UI", () => {
  it("disables unavailable undo and redo and keeps history inspectable", () => {
    const markup = renderToStaticMarkup(<CameraHistoryControls history={createCameraHistory()} dirtyGroupIds={new Set()} onTravel={() => {}} />);
    expect(markup).toContain('disabled="" title="Undo');
    expect(markup).toContain('disabled="" title="Redo');
    expect(markup).toContain('aria-label="History"');
    expect(markup).toContain("No unsaved group changes");
  });

  it("shows the current state, redo branch, affected IDs, and unsaved deletions", () => {
    const state = createCameraHistory({ groups: [], originalXmlString: "" });
    const entry = {
      label: "Delete group", groupIds: ["Deleted_Group"], before: state.initial, after: state.initial,
      beforeSelection: { groupId: "Deleted_Group", slotId: 0 }, afterSelection: { groupId: "", slotId: 0 },
    };
    const history: CameraHistoryState = { ...state, entries: [entry, { ...entry, label: "Next edit" }], cursor: 1 };
    const markup = renderToStaticMarkup(<CameraHistoryModal history={history} dirtyGroupIds={new Set(["Deleted_Group"])} onTravel={() => {}} onClose={() => {}} />);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("1. Delete group");
    expect(markup).toContain("To redo");
    expect(markup).toContain("Deleted_Group");
    expect(markup).toContain("Deleted</span>");
  });
});
