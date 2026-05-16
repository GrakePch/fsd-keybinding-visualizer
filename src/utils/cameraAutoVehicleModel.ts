import type { SelectableVehicleModel } from "../types/vehicleModel";

export function getAutoSelectedVehicleModel(groupId: string, models: SelectableVehicleModel[]) {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) return null;

  return models.find((model) => {
    const className = model.className?.trim();
    if (!className) return false;

    return getClassNameMatches(className).some((candidate) => normalizedGroupId.includes(candidate));
  }) ?? null;
}

function getClassNameMatches(className: string) {
  const tokens = className.split("_").filter(Boolean);
  const matches = [className];

  for (let length = tokens.length - 1; length >= 2; length -= 1) {
    matches.push(tokens.slice(0, length).join("_"));
  }

  return matches;
}
