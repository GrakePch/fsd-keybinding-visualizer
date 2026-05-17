import type { SelectableVehicleModel, SpvVehicleEntry, VehicleFallbackBoxModel, VehicleModelBounds, VehicleModelManifest, VehicleViewportModel } from "../types/vehicleModel";
import { getSelectableVehicleModelByClassName } from "./vehicleModelManifest";

const METERS_TO_SOURCE_UNITS = 100;

export function getAutoSelectedSpvVehicle(groupId: string, vehicles: SpvVehicleEntry[]) {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) return null;

  let bestMatch: { vehicle: SpvVehicleEntry; score: number; order: number } | null = null;

  vehicles.forEach((vehicle, order) => {
    const className = vehicle.ClassName?.trim();
    if (!className) return;

    const score = getBestClassNameMatchScore(normalizedGroupId, className);
    if (score === null) return;

    if (!bestMatch || score > bestMatch.score || (score === bestMatch.score && order < bestMatch.order)) {
      bestMatch = { vehicle, score, order };
    }
  });

  return bestMatch?.vehicle ?? null;
}

export function getAutoSelectedVehicleModel(groupId: string, vehicles: SpvVehicleEntry[], manifest: VehicleModelManifest | null): VehicleViewportModel | null {
  const spvVehicle = getAutoSelectedSpvVehicle(groupId, vehicles);
  if (!spvVehicle) return null;

  return resolveVehicleViewportModelFromSpvVehicle(spvVehicle, manifest);
}

export function resolveVehicleViewportModelFromSpvVehicle(spvVehicle: SpvVehicleEntry, manifest: VehicleModelManifest | null): VehicleViewportModel | null {
  const className = spvVehicle.ClassName?.trim();
  if (!className) return null;

  const glbModel = getSelectableVehicleModelByClassName(manifest, className);
  if (glbModel) {
    return getSelectableVehicleModelWithSpvBounds(glbModel, spvVehicle);
  }

  return getFallbackBoxModelFromSpvVehicle(spvVehicle);
}

export function getSelectableVehicleModelWithSpvBounds(model: SelectableVehicleModel, spvVehicle: SpvVehicleEntry | null | undefined): SelectableVehicleModel & { visualKind: "glb"; spvClassName?: string } {
  const spvBounds = spvVehicle ? getBoundsFromSpvDimensions(spvVehicle.Dimensions) : null;
  const spvClassName = spvVehicle?.ClassName?.trim();

  return {
    ...model,
    visualKind: "glb",
    ...(spvClassName ? { spvClassName } : {}),
    ...(spvBounds ? { bounds: spvBounds } : {}),
  };
}

export function getFallbackBoxModelFromSpvVehicle(spvVehicle: SpvVehicleEntry): VehicleFallbackBoxModel | null {
  const className = spvVehicle.ClassName?.trim();
  const bounds = getBoundsFromSpvDimensions(spvVehicle.Dimensions);

  if (!className || !bounds) {
    return null;
  }

  const length = spvVehicle.Dimensions?.Length as number;
  const width = spvVehicle.Dimensions?.Width as number;
  const height = spvVehicle.Dimensions?.Height as number;

  return {
    visualKind: "box",
    slug: `spv-${className}`,
    displayName: spvVehicle.Name?.trim() || className,
    className,
    spvClassName: className,
    src: null,
    glb: null,
    dimensions: { length, width, height },
    bounds,
  };
}

export function getBoundsFromSpvDimensions(dimensions: Partial<{ Length: number; Width: number; Height: number }> | null | undefined): VehicleModelBounds | null {
  const length = dimensions?.Length;
  const width = dimensions?.Width;
  const height = dimensions?.Height;

  if (!isPositiveFiniteNumber(length) || !isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return null;
  }

  const sourceWidth = width * METERS_TO_SOURCE_UNITS;
  const sourceLength = length * METERS_TO_SOURCE_UNITS;
  const sourceHeight = height * METERS_TO_SOURCE_UNITS;

  return {
    center: [0, 0, 0],
    size: [sourceWidth, sourceLength, sourceHeight],
    radius: Math.hypot(sourceWidth, sourceLength, sourceHeight) / 2,
  };
}

function getBestClassNameMatchScore(groupId: string, className: string) {
  if (groupId === className) return 10_000 + className.length;

  return getClassNameMatches(className).reduce<number | null>((bestScore, candidate) => {
    if (!groupId.includes(candidate)) return bestScore;
    return Math.max(bestScore ?? 0, candidate.length);
  }, null);
}

function getClassNameMatches(className: string) {
  const tokens = className.split("_").filter(Boolean);
  const matches = [className];

  for (let length = tokens.length - 1; length >= 2; length -= 1) {
    matches.push(tokens.slice(0, length).join("_"));
  }

  return matches;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
