import type { SavedViewGroup } from "../types/savedViews";

export function formatCameraGroupName(groupId: string) {
  return groupId.replaceAll("_", " ");
}

export function normalizeGroupSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[_\s]+/g, " ").trim();
}

const PLAYER_ON_FOOT_GROUP_NAME = "Player On Foot";

export function getVisibleCameraGroups(groups: SavedViewGroup[], query: string) {
  const normalizedQuery = normalizeGroupSearchText(query);
  const filteredGroups = normalizedQuery
    ? groups.filter((group) => normalizeGroupSearchText(`${group.id} ${formatCameraGroupName(group.id)}`).includes(normalizedQuery))
    : groups;

  return [...filteredGroups].sort((left, right) => {
    const leftName = formatCameraGroupName(left.id);
    const rightName = formatCameraGroupName(right.id);
    const leftIsPlayerOnFoot = leftName === PLAYER_ON_FOOT_GROUP_NAME;
    const rightIsPlayerOnFoot = rightName === PLAYER_ON_FOOT_GROUP_NAME;

    if (leftIsPlayerOnFoot !== rightIsPlayerOnFoot) return leftIsPlayerOnFoot ? -1 : 1;

    return leftName.localeCompare(rightName, undefined, { sensitivity: "base", numeric: true });
  });
}
