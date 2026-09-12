import thirdPersonCameraData from "../data/third_person_cameras.json";
import type { ThirdPersonCameraBaseConfig, ThirdPersonCameraEntry } from "../types/thirdPersonCamera";
import type { SeatVehicleEntry } from "../types/vehicleModel";

const cameras = Array.isArray(thirdPersonCameraData.cameras)
  ? thirdPersonCameraData.cameras.filter(isThirdPersonCameraEntry)
  : [];

const cameraConfigById = cameras.reduce<Record<string, ThirdPersonCameraBaseConfig>>((index, entry) => {
  const normalizedCameraId = entry.cameraId.trim();
  if (normalizedCameraId) index[normalizedCameraId] = entry.baseConfig;
  return index;
}, {});

export function parseVehicleCameraIndex(data: unknown, configs: Record<string, ThirdPersonCameraBaseConfig>) {
  const payload = data as { schemaVersion?: number; cameraIdsByVehicleId?: unknown } | null;
  const raw = payload?.cameraIdsByVehicleId;
  if (payload?.schemaVersion !== 3 || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.some(([id, ids]) => !id.trim() || !Array.isArray(ids) || ids.some((value) => typeof value !== "string"))) return null;
  return Object.fromEntries(entries.map(([id, ids]) => [id.trim(), [...new Set((ids as string[]).filter((cameraId) => Object.prototype.hasOwnProperty.call(configs, cameraId)))]]));
}

const vehicleCameraIndex = parseVehicleCameraIndex(thirdPersonCameraData, cameraConfigById);

export function getVehicleCameraIndex() {
  return vehicleCameraIndex;
}

export function resolveVehicleCamera(
  vehicleId: string,
  selectedCameraId?: string,
  index: Record<string, string[]> | null = vehicleCameraIndex,
  configs: Record<string, ThirdPersonCameraBaseConfig> = cameraConfigById,
) {
  const cameraIds = [...new Set((index && Object.prototype.hasOwnProperty.call(index, vehicleId) ? index[vehicleId] : []).filter((id) => Object.prototype.hasOwnProperty.call(configs, id)))].sort();
  // An explicit stale selection must be resolved by the user, even if only one candidate remains.
  const cameraId = selectedCameraId
    ? cameraIds.includes(selectedCameraId) ? selectedCameraId : null
    : cameraIds.length === 1 ? cameraIds[0] : null;
  return {
    cameraIds,
    cameraId,
    cameraConfig: cameraId ? configs[cameraId] : null,
    needsSelection: cameraIds.length > 0 && !cameraId,
    indexAvailable: index !== null,
  };
}

export function getThirdPersonCameraConfigForSeat(
  seat: SeatVehicleEntry | null | undefined,
  preferredVehicleId?: string | null,
) {
  return selectThirdPersonCameraConfigForSeat(seat, cameraConfigById, preferredVehicleId);
}

export function selectThirdPersonCameraConfigForSeat(
  seat: SeatVehicleEntry | null | undefined,
  configByCameraId: Record<string, ThirdPersonCameraBaseConfig>,
  preferredVehicleId?: string | null,
) {
  const availableCameraIds = seat?.thirdPersonCameraIds.filter((cameraId) => configByCameraId[cameraId]) || [];
  if (!availableCameraIds.length) return null;

  const cameraId = [...availableCameraIds].sort(
    (left, right) =>
      getCameraMatchScore(right, preferredVehicleId, seat?.groupId) -
        getCameraMatchScore(left, preferredVehicleId, seat?.groupId) ||
      left.localeCompare(right),
  )[0];
  return configByCameraId[cameraId] || null;
}

export function getThirdPersonCameraConfigIndex() {
  return cameraConfigById;
}

function getCameraMatchScore(cameraId: string, preferredVehicleId?: string | null, groupId?: string) {
  const definitionId = cameraId.replace(/_ThirdPersonFlight$/i, "");
  const vehicleId = preferredVehicleId?.trim() || "";

  if (vehicleId === definitionId) return 100_000 + definitionId.length;
  if (vehicleId.startsWith(`${definitionId}_`)) return 80_000 + definitionId.length;
  if (definitionId.startsWith(`${vehicleId}_`) && vehicleId) return 60_000 + vehicleId.length;
  if (groupId?.includes(definitionId)) return 40_000 + definitionId.length;
  return getCommonLeadingTokenCount(definitionId, vehicleId) * 1_000 + definitionId.length;
}

function getCommonLeadingTokenCount(left: string, right: string) {
  const leftTokens = left.split("_").filter(Boolean);
  const rightTokens = right.split("_").filter(Boolean);
  let count = 0;
  while (count < leftTokens.length && leftTokens[count] === rightTokens[count]) count += 1;
  return count;
}

function isThirdPersonCameraEntry(value: unknown): value is ThirdPersonCameraEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as ThirdPersonCameraEntry;
  const distance = entry.baseConfig?.distanceConfig;
  const targetOffset = entry.baseConfig?.targetOffsetConfig;
  return (
    typeof entry.cameraId === "string" &&
    isFiniteNumber(distance?.initialDistance) &&
    isFiniteNumber(distance?.minDistance) &&
    isFiniteNumber(distance?.maxDistance) &&
    isVec3(targetOffset?.targetPositionOffset) &&
    isVec3(targetOffset?.userTargetOffsetMin) &&
    isVec3(targetOffset?.userTargetOffsetMax)
    && distance.minDistance >= 0 && distance.minDistance <= distance.maxDistance
    && (["x", "y", "z"] as const).every((axis) => targetOffset.userTargetOffsetMin[axis] <= targetOffset.userTargetOffsetMax[axis])
  );
}

function isVec3(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const vector = value as { x?: unknown; y?: unknown; z?: unknown };
  return isFiniteNumber(vector.x) && isFiniteNumber(vector.y) && isFiniteNumber(vector.z);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
