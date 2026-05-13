import type { SelectableVehicleModel } from "../types/vehicleModel";

export type GroupModelDrafts = Record<string, SelectableVehicleModel>;

export function getDraftModelForGroup(drafts: GroupModelDrafts, groupId: string) {
  if (!groupId) return null;
  return drafts[groupId] || null;
}

export function setDraftModelForGroup(drafts: GroupModelDrafts, groupId: string, model: SelectableVehicleModel) {
  if (!groupId) return drafts;

  return {
    ...drafts,
    [groupId]: model,
  };
}
