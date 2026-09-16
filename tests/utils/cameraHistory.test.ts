import { describe, expect, it } from "vitest";
import { CAMERA_HISTORY_LIMIT, cameraHistoryReducer, createCameraHistory, getCameraHistorySnapshot, getChangedCameraGroupIds, type CameraEditorSnapshot, type CameraHistoryState } from "../../src/utils/cameraHistory";
import { addSavedViewGroup, buildSavedViewsXml, createDefaultCameraSlot, updateSavedCameraSlot } from "../../src/utils/savedViews";
import { resetSlotsToSeatViewPreset } from "../../src/utils/seatViewPreset";
import type { SavedViewsDocument } from "../../src/types/savedViews";

const original: SavedViewsDocument = {
  originalXmlString: "<SavedViews/>",
  groups: ["Alpha", "Beta"].map((id) => ({ id, rawAttributes: { ID: id, Custom: "preserved" }, slots: [createDefaultCameraSlot(0)] })),
};

function edit(state: CameraHistoryState, after: CameraEditorSnapshot, mergeKey?: string) {
  return cameraHistoryReducer(state, { type: "edit", mergeKey, entry: {
    label: "Edit", before: getCameraHistorySnapshot(state), after,
    groupIds: [...getChangedCameraGroupIds(after.document, getCameraHistorySnapshot(state).document)],
    beforeSelection: { groupId: "Alpha", slotId: 0 }, afterSelection: { groupId: "Alpha", slotId: 0 },
  } });
}

function changeDistance(state: CameraHistoryState, distance: number, groupId = "Alpha", mergeKey?: string) {
  const snapshot = getCameraHistorySnapshot(state);
  const document = snapshot.document!;
  const slot = document.groups.find((group) => group.id === groupId)!.slots[0];
  return edit(state, { ...snapshot, document: updateSavedCameraSlot(document, groupId, { ...slot, distance }) }, mergeKey);
}

describe("camera document history", () => {
  it("undoes and redoes across groups while tracking each group's saved content", () => {
    let state = changeDistance(createCameraHistory(original), 12);
    state = changeDistance(state, 23, "Beta");
    expect([...getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline)]).toEqual(["Alpha", "Beta"]);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 1 });
    expect([...getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline)]).toEqual(["Alpha"]);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 0 });
    expect(getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline).size).toBe(0);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 2 });
    expect(getCameraHistorySnapshot(state).document!.groups[1].slots[0].distance).toBe(23);
  });

  it("merges a gesture, removes a net-zero gesture, and keeps separate gestures separate", () => {
    const initial = createCameraHistory(original);
    let state = changeDistance(initial, 10, "Alpha", "drag1");
    state = changeDistance(state, 20, "Alpha", "drag1");
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].before.document).toBe(original);
    state = changeDistance(state, original.groups[0].slots[0].distance, "Alpha", "drag1");
    expect(state.entries).toHaveLength(0);
    state = changeDistance(state, 10, "Alpha", "drag2");
    state = changeDistance(state, 20, "Alpha", "drag3");
    expect(state.entries).toHaveLength(2);
  });

  it("drops the redo branch on a new edit but retains it for a no-op", () => {
    let state = changeDistance(changeDistance(createCameraHistory(original), 10), 20);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 1 });
    expect(changeDistance(state, 10)).toBe(state);
    state = changeDistance(state, 30);
    expect(state.entries).toHaveLength(2);
    expect(state.entries[1].after.document!.groups[0].slots[0].distance).toBe(30);
  });

  it("keeps history through saves and compares undo/redo against the actual saved version", () => {
    let state = changeDistance(createCameraHistory(original), 10, "Alpha", "same");
    const written = getCameraHistorySnapshot(state).document!;
    state = cameraHistoryReducer(state, { type: "saved", document: written, session: state.session });
    state = changeDistance(state, 20, "Alpha", "same");
    expect(state.entries).toHaveLength(2);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 1 });
    expect(getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline).size).toBe(0);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 0 });
    expect([...getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline)]).toEqual(["Alpha"]);
  });

  it("does not mark edits made during an asynchronous save as saved", () => {
    let state = changeDistance(createCameraHistory(original), 10);
    const written = getCameraHistorySnapshot(state).document!;
    state = changeDistance(state, 20);
    state = cameraHistoryReducer(state, { type: "saved", document: written, session: state.session });
    expect([...getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline)]).toEqual(["Alpha"]);
    state = cameraHistoryReducer(state, { type: "load", document: original });
    expect(state.entries).toHaveLength(0);
    expect(state.cursor).toBe(0);
    expect(cameraHistoryReducer(state, { type: "saved", document: written, session: state.session - 1 })).toBe(state);
  });

  it("undoes a bulk preset atomically and preserves unknown attributes", () => {
    let state = createCameraHistory(original);
    state = edit(state, { bindings: {}, document: { ...original, groups: original.groups.map((group) => ({ ...group, slots: resetSlotsToSeatViewPreset() })) } });
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].groupIds).toEqual(["Alpha", "Beta"]);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 0 });
    expect(buildSavedViewsXml(getCameraHistorySnapshot(state).document!)).toBe(buildSavedViewsXml(original));
  });

  it("restores a deleted group's slots and reference binding together", () => {
    const bindings = { Alpha: { mode: "vehicle-context" as const, vehicleId: "vehicle" } };
    let state = edit(createCameraHistory(original), { document: original, bindings });
    expect(getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline).size).toBe(0);
    state = edit(state, { document: { ...original, groups: original.groups.slice(1) }, bindings: {} });
    expect([...getChangedCameraGroupIds(getCameraHistorySnapshot(state).document, state.baseline)]).toEqual(["Alpha"]);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 1 });
    expect(getCameraHistorySnapshot(state)).toEqual({ document: original, bindings });
  });

  it("tracks new groups and returns to no document when undoing the first addition", () => {
    let state = createCameraHistory();
    const document = addSavedViewGroup({ groups: [], originalXmlString: "" }, "New");
    state = edit(state, { document, bindings: {} });
    expect([...getChangedCameraGroupIds(document, state.baseline)]).toEqual(["New"]);
    state = cameraHistoryReducer(state, { type: "travel", cursor: 0 });
    expect(getCameraHistorySnapshot(state).document).toBeNull();
  });

  it("ignores ordering of raw known attributes and stale values overridden by export", () => {
    const document = { ...original, groups: original.groups.map((group) => ({ ...group, rawAttributes: { Custom: "preserved", ID: "stale" }, slots: group.slots.map((slot) => ({ ...slot, rawAttributes: { ...slot.rawAttributes, Distance: "999" } })) })) };
    expect(getChangedCameraGroupIds(document, original).size).toBe(0);
    expect(edit(createCameraHistory(original), { document, bindings: {} }).entries).toHaveLength(0);
  });

  it("retains a bounded history with the correct oldest restorable state and baseline", () => {
    let state = createCameraHistory(original);
    for (let index = 0; index < CAMERA_HISTORY_LIMIT + 5; index += 1) state = changeDistance(state, index + 100);
    expect(state.entries).toHaveLength(CAMERA_HISTORY_LIMIT);
    expect(state.baseline).toBe(original);
    state = cameraHistoryReducer(state, { type: "travel", cursor: -1 });
    expect(getCameraHistorySnapshot(state).document!.groups[0].slots[0].distance).toBe(104);
  });
});
