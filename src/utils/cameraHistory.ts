import type { SavedCameraSlot, SavedViewGroup, SavedViewsDocument } from "../types/savedViews";
import type { GroupVehicleBindings } from "./cameraVehicleBinding";
import { buildSavedViewsXml } from "./savedViews";

export const CAMERA_HISTORY_LIMIT = 100;

export interface CameraEditorSnapshot {
  document: SavedViewsDocument | null;
  bindings: GroupVehicleBindings;
}

export interface CameraHistorySelection {
  groupId: string;
  slotId: number;
}

export interface CameraHistoryEntry {
  label: string;
  groupIds: string[];
  before: CameraEditorSnapshot;
  after: CameraEditorSnapshot;
  beforeSelection: CameraHistorySelection;
  afterSelection: CameraHistorySelection;
}

export interface CameraHistoryState {
  initial: CameraEditorSnapshot;
  entries: CameraHistoryEntry[];
  cursor: number;
  baseline: SavedViewsDocument | null;
  session: number;
  mergeKey?: string;
}

export type CameraHistoryAction =
  | { type: "load"; document: SavedViewsDocument }
  | { type: "edit"; entry: CameraHistoryEntry; mergeKey?: string }
  | { type: "travel"; cursor: number }
  | { type: "saved"; document: SavedViewsDocument; session: number };

export function createCameraHistory(document: SavedViewsDocument | null = null, session = 0): CameraHistoryState {
  return { initial: { document, bindings: {} }, entries: [], cursor: 0, baseline: document, session };
}

export function getCameraHistorySnapshot(state: CameraHistoryState): CameraEditorSnapshot {
  return state.cursor === 0 ? state.initial : state.entries[state.cursor - 1].after;
}

// Groups are immutable. Reuse signatures so a slider edit only serializes its changed group.
const groupSignatures = new WeakMap<SavedViewGroup, string>();

function groupSignature(group: SavedViewGroup) {
  const cached = groupSignatures.get(group);
  if (cached !== undefined) return cached;
  const sortAttributes = (attributes: Record<string, string>) => Object.fromEntries(Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)));
  const signature = buildSavedViewsXml({ originalXmlString: "", groups: [{
    ...group, rawAttributes: sortAttributes({ ...group.rawAttributes, ID: group.id }),
    slots: group.slots.map((slot) => ({ ...slot, rawAttributes: sortAttributes(slot.rawAttributes) })),
  }] });
  groupSignatures.set(group, signature);
  return signature;
}

/** Compare exported content, including unknown attributes, rather than stale raw known attributes. */
export function getChangedCameraGroupIds(document: SavedViewsDocument | null, baseline: SavedViewsDocument | null): Set<string> {
  const signatures = (value: SavedViewsDocument | null) => new Map(value?.groups.map((group) => [group.id, groupSignature(group)]));
  const current = signatures(document);
  const saved = signatures(baseline);
  return new Set([...new Set([...current.keys(), ...saved.keys()])].filter((id) => current.get(id) !== saved.get(id)));
}

function snapshotsEqual(left: CameraEditorSnapshot, right: CameraEditorSnapshot) {
  const documentsEqual = left.document === right.document || (left.document !== null && right.document !== null
    && left.document.groups.length === right.document.groups.length
    && left.document.groups.every((group, index) => groupSignature(group) === groupSignature(right.document!.groups[index])));
  return documentsEqual && JSON.stringify(left.bindings) === JSON.stringify(right.bindings);
}

export function cameraHistoryReducer(state: CameraHistoryState, action: CameraHistoryAction): CameraHistoryState {
  if (action.type === "load") return createCameraHistory(action.document, state.session + 1);
  if (action.type === "saved") {
    // A write may finish after more edits, or even after another file was loaded.
    return action.session === state.session ? { ...state, baseline: action.document, mergeKey: undefined } : state;
  }
  if (action.type === "travel") {
    return { ...state, cursor: Math.max(0, Math.min(state.entries.length, action.cursor)), mergeKey: undefined };
  }
  const current = getCameraHistorySnapshot(state);
  if (snapshotsEqual(current, action.entry.after)) return state;

  const entries = state.entries.slice(0, state.cursor);
  const previous = entries[entries.length - 1];
  const canMerge = action.mergeKey !== undefined && action.mergeKey === state.mergeKey && state.cursor === state.entries.length && previous;
  if (canMerge) {
    const merged = { ...action.entry, before: previous.before, beforeSelection: previous.beforeSelection };
    // Dragging back to the starting value leaves no undo step.
    if (snapshotsEqual(merged.before, merged.after)) entries.pop();
    else entries[entries.length - 1] = merged;
  } else {
    entries.push({ ...action.entry, before: current });
  }
  let initial = state.initial;
  if (entries.length > CAMERA_HISTORY_LIMIT) initial = entries.shift()!.after;
  return { ...state, initial, entries, cursor: entries.length, mergeKey: action.mergeKey };
}

export function describeCameraSlotChange(before: SavedCameraSlot | undefined, after: SavedCameraSlot) {
  if (!before) return { label: `Create slot ${after.id + 1}`, fields: "create" };
  const labels: Partial<Record<keyof SavedCameraSlot, string>> = {
    targetOffset: "Target Offset", cameraRotationAngle: "Rotation Angle", distance: "Distance", lensSize: "Lens Zoom", fStop: "F-Stop", type: "Type",
  };
  const fields = (Object.keys(labels) as (keyof SavedCameraSlot)[]).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return { label: `Edit slot ${after.id + 1}: ${fields.map((key) => labels[key]).join(", ")}`, fields: fields.join(",") };
}
