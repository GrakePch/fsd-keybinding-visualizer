export function formatCameraGroupName(groupId: string) {
  return groupId.replaceAll("_", " ");
}

export function normalizeGroupSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[_\s]+/g, " ").trim();
}
