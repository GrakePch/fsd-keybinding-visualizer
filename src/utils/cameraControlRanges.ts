import type { Vec3 } from "../types/savedViews";
import type { ThirdPersonCameraBaseConfig } from "../types/thirdPersonCamera";
import type { VehicleModelBounds } from "../types/vehicleModel";

const VEHICLE_MODEL_METERS_PER_SOURCE_UNIT = 0.01;

export type CameraControlRangeSource = "datacore" | "inferred" | "default";

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
  cameraConfig?: ThirdPersonCameraBaseConfig | null;
  bounds?: VehicleModelBounds | null;
  currentTargetOffset?: Vec3 | null;
  currentDistance?: number | null;
};

type CameraControlRangePreset = {
  targetOffset: Record<keyof Vec3, NumericRange>;
  distance: NumericRange;
};

const DEFAULT_RANGE_PRESET: CameraControlRangePreset = {
  targetOffset: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -60, max: 60 },
  },
  distance: { min: 0, max: 170 },
};

export function getCameraControlRanges({ cameraConfig, bounds, currentTargetOffset, currentDistance }: CameraControlRangeInput): CameraControlRanges {
  const datacorePreset = getDatacorePreset(cameraConfig);
  const inferredPreset = datacorePreset ? null : getInferredPreset(bounds);
  const source: CameraControlRangeSource = datacorePreset ? "datacore" : inferredPreset ? "inferred" : "default";
  const preset = datacorePreset || inferredPreset || DEFAULT_RANGE_PRESET;
  const inputMultiplier = source === "datacore" ? 1.5 : 2;

  const targetOffset = {
    x: buildAxisRange(preset.targetOffset.x, currentTargetOffset?.x, inputMultiplier),
    y: buildAxisRange(preset.targetOffset.y, currentTargetOffset?.y, inputMultiplier),
    z: buildAxisRange(preset.targetOffset.z, currentTargetOffset?.z, inputMultiplier),
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

function getDatacorePreset(cameraConfig: ThirdPersonCameraBaseConfig | null | undefined): CameraControlRangePreset | null {
  const distance = cameraConfig?.distanceConfig;
  const minOffset = cameraConfig?.targetOffsetConfig.userTargetOffsetMin;
  const maxOffset = cameraConfig?.targetOffsetConfig.userTargetOffsetMax;
  if (
    !distance ||
    !minOffset ||
    !maxOffset ||
    !isUsableRange({ min: distance?.minDistance, max: distance?.maxDistance }) ||
    !isUsableRange({ min: minOffset?.x, max: maxOffset?.x }) ||
    !isUsableRange({ min: minOffset?.y, max: maxOffset?.y }) ||
    !isUsableRange({ min: minOffset?.z, max: maxOffset?.z })
  ) {
    return null;
  }

  return {
    targetOffset: {
      x: { min: minOffset.x, max: maxOffset.x },
      y: { min: minOffset.y, max: maxOffset.y },
      z: { min: minOffset.z, max: maxOffset.z },
    },
    distance: { min: distance.minDistance, max: distance.maxDistance },
  };
}

function getInferredPreset(bounds: VehicleModelBounds | null | undefined): CameraControlRangePreset | null {
  const sizeMeters = getUsableSizeMeters(bounds);
  if (!sizeMeters) return null;

  const longest = Math.max(sizeMeters[0], sizeMeters[1]);
  if (longest <= 20) {
    return symmetricPreset(30, 25, 15, { min: 8, max: 30 });
  }
  if (longest <= 60) {
    return symmetricPreset(100, 100, 60, { min: 25, max: 170 });
  }
  if (longest <= 110) {
    return symmetricPreset(120, 120, 70, { min: 45, max: 190 });
  }

  return symmetricPreset(180, 150, 85, { min: 70, max: 240 });
}

function symmetricPreset(x: number, y: number, z: number, distance: NumericRange): CameraControlRangePreset {
  return {
    targetOffset: {
      x: { min: -x, max: x },
      y: { min: -y, max: y },
      z: { min: -z, max: z },
    },
    distance,
  };
}

function getUsableSizeMeters(bounds: VehicleModelBounds | null | undefined): [number, number, number] | null {
  if (!bounds || bounds.size.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  return bounds.size.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
}

function buildAxisRange(recommended: NumericRange, currentValue: number | null | undefined, inputMultiplier: number): CameraControlAxisRange {
  return {
    recommended,
    slider: expandRangeToIncludeValue(recommended, currentValue),
    input: { min: recommended.min * inputMultiplier, max: recommended.max * inputMultiplier },
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

function isUsableRange(range: { min: unknown; max: unknown }): range is NumericRange {
  return typeof range.min === "number" && Number.isFinite(range.min) && typeof range.max === "number" && Number.isFinite(range.max) && range.min <= range.max;
}
