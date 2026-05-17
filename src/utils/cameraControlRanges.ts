import type { Vec3 } from "../types/savedViews";
import type { VehicleModelBounds } from "../types/vehicleModel";

const VEHICLE_MODEL_METERS_PER_SOURCE_UNIT = 0.01;

export type CameraControlRangeSource = "precise" | "inferred" | "default";

export type NumericRange = {
  min: number;
  max: number;
};

export type CameraControlAxisRange = {
  recommended: NumericRange;
  slider: NumericRange;
  input: NumericRange;
  isCurrentValueOutsideRecommendedRange: boolean;
};

export type CameraControlRanges = {
  source: CameraControlRangeSource;
  targetOffset: Record<keyof Vec3, CameraControlAxisRange>;
  distance: CameraControlAxisRange;
  hasCurrentValueOutsideRecommendedRange: boolean;
};

type CameraControlRangeInput = {
  className?: string | null;
  bounds?: VehicleModelBounds | null;
  currentTargetOffset?: Vec3 | null;
  currentDistance?: number | null;
};

type CameraControlRangePreset = {
  x: number;
  y: number;
  z: number;
  distance: NumericRange;
};

type PreciseRangeOverride = CameraControlRangePreset & {
  className?: string;
  classPrefix?: string;
};

const DEFAULT_RANGE_PRESET: CameraControlRangePreset = {
  x: 100,
  y: 100,
  z: 60,
  distance: { min: 0, max: 170 },
};

const PRECISE_RANGE_OVERRIDES: PreciseRangeOverride[] = [
  { classPrefix: "ANVL_C8", x: 30, y: 25, z: 15, distance: { min: 8, max: 25 } },
  { classPrefix: "RSI_Zeus", x: 100, y: 100, z: 60, distance: { min: 30, max: 170 } },
  { classPrefix: "CRUS_Spirit", x: 100, y: 100, z: 60, distance: { min: 30, max: 170 } },
  { classPrefix: "CRUS_Starlifter", x: 100, y: 100, z: 60, distance: { min: 55, max: 170 } },
  { className: "ANVL_Carrack", x: 180, y: 150, z: 85, distance: { min: 85, max: 220 } },
];

export function getCameraControlRanges({ className, bounds, currentTargetOffset, currentDistance }: CameraControlRangeInput): CameraControlRanges {
  const precisePreset = getPrecisePreset(className);
  const inferredPreset = precisePreset ? null : getInferredPreset(bounds);
  const source: CameraControlRangeSource = precisePreset ? "precise" : inferredPreset ? "inferred" : "default";
  const preset = precisePreset || inferredPreset || DEFAULT_RANGE_PRESET;
  const inputMultiplier = source === "precise" ? 1.5 : 2;

  const targetOffset = {
    x: buildSymmetricAxisRange(preset.x, currentTargetOffset?.x, inputMultiplier),
    y: buildSymmetricAxisRange(preset.y, currentTargetOffset?.y, inputMultiplier),
    z: buildSymmetricAxisRange(preset.z, currentTargetOffset?.z, inputMultiplier),
  };
  const distance = buildDistanceRange(preset.distance, currentDistance, inputMultiplier);

  return {
    source,
    targetOffset,
    distance,
    hasCurrentValueOutsideRecommendedRange:
      targetOffset.x.isCurrentValueOutsideRecommendedRange ||
      targetOffset.y.isCurrentValueOutsideRecommendedRange ||
      targetOffset.z.isCurrentValueOutsideRecommendedRange ||
      distance.isCurrentValueOutsideRecommendedRange,
  };
}

function getPrecisePreset(className: string | null | undefined): CameraControlRangePreset | null {
  if (!className) return null;

  const matches = PRECISE_RANGE_OVERRIDES.filter((override) => override.className === className || (override.classPrefix ? className.startsWith(override.classPrefix) : false));
  if (!matches.length) return null;

  const [bestMatch] = matches.sort((a, b) => getOverrideScore(b) - getOverrideScore(a));
  return bestMatch;
}

function getOverrideScore(override: PreciseRangeOverride) {
  return override.className ? Number.MAX_SAFE_INTEGER : override.classPrefix?.length || 0;
}

function getInferredPreset(bounds: VehicleModelBounds | null | undefined): CameraControlRangePreset | null {
  const sizeMeters = getUsableSizeMeters(bounds);
  if (!sizeMeters) return null;

  const longest = Math.max(sizeMeters[0], sizeMeters[1]);
  if (longest <= 20) {
    return { x: 30, y: 25, z: 15, distance: { min: 8, max: 30 } };
  }
  if (longest <= 60) {
    return { x: 100, y: 100, z: 60, distance: { min: 25, max: 170 } };
  }
  if (longest <= 110) {
    return { x: 120, y: 120, z: 70, distance: { min: 45, max: 190 } };
  }

  return { x: 180, y: 150, z: 85, distance: { min: 70, max: 240 } };
}

function getUsableSizeMeters(bounds: VehicleModelBounds | null | undefined): [number, number, number] | null {
  if (!bounds || bounds.size.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  return bounds.size.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
}

function buildSymmetricAxisRange(maxMagnitude: number, currentValue: number | null | undefined, inputMultiplier: number): CameraControlAxisRange {
  const recommended = { min: -maxMagnitude, max: maxMagnitude };
  return {
    recommended,
    slider: expandRangeToIncludeValue(recommended, currentValue),
    input: { min: -maxMagnitude * inputMultiplier, max: maxMagnitude * inputMultiplier },
    isCurrentValueOutsideRecommendedRange: isOutsideRange(currentValue, recommended),
  };
}

function buildDistanceRange(recommended: NumericRange, currentValue: number | null | undefined, inputMultiplier: number): CameraControlAxisRange {
  return {
    recommended,
    slider: expandRangeToIncludeValue(recommended, currentValue),
    input: { min: 0, max: recommended.max * inputMultiplier },
    isCurrentValueOutsideRecommendedRange: isOutsideRange(currentValue, recommended),
  };
}

function expandRangeToIncludeValue(range: NumericRange, value: number | null | undefined): NumericRange {
  if (!Number.isFinite(value)) return range;
  const finiteValue = value as number;
  return {
    min: Math.min(range.min, finiteValue),
    max: Math.max(range.max, finiteValue),
  };
}

function isOutsideRange(value: number | null | undefined, range: NumericRange) {
  return Number.isFinite(value) && ((value as number) < range.min || (value as number) > range.max);
}
