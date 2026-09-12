import type { ThirdPersonCameraBaseConfig } from "../types/thirdPersonCamera";
import type { SpvVehicleEntry, VehicleModelManifest, VehicleViewportModel } from "../types/vehicleModel";
import { getFallbackBoxModelFromSpvVehicle, getSelectableVehicleModelWithSpvBounds } from "./cameraAutoVehicleModel";
import { getCameraControlRanges } from "./cameraControlRanges";
import { getSelectableVehicleModels } from "./vehicleModelManifest";
import { getThirdPersonCameraConfigIndex, getVehicleCameraIndex, resolveVehicleCamera } from "./thirdPersonCameraData";

export type GroupVehicleBinding = { mode: "vehicle-context"; vehicleId: string; cameraId?: string };
export type GroupVehicleBindings = Record<string, GroupVehicleBinding>;

export type ReferenceVehicle = {
  vehicleId: string;
  displayName: string;
  model: VehicleViewportModel | null;
  cameraIds: string[];
};

export function getReferenceVehicles(
  manifest: VehicleModelManifest | null,
  vehicles: SpvVehicleEntry[],
  cameraIndex: Record<string, string[]> | null = getVehicleCameraIndex(),
): ReferenceVehicle[] {
  const spvById = new Map(vehicles.map((vehicle) => [vehicle.ClassName.trim(), vehicle]));
  const models = getSelectableVehicleModels(manifest);
  const modelBySlug = new Map(models.map((model) => [model.slug, model]));
  const modelById = new Map(models.filter((model) => model.className).map((model) => [model.className!.trim(), model]));
  for (const [id, slug] of Object.entries(manifest?.byClassName || {})) {
    const model = modelBySlug.get(slug);
    if (model) modelById.set(id, model);
  }
  // The SPV main list is the allowlist for user-facing reference vehicles. The
  // camera index also contains AI, template and mission variants which are
  // useful for association lookup but should not clutter manual selection.
  const ids = new Set(spvById.keys());
  return [...ids].filter(Boolean).map((vehicleId) => {
    const spv = spvById.get(vehicleId);
    const glb = modelById.get(vehicleId);
    const model = glb
      ? getSelectableVehicleModelWithSpvBounds(glb, spv)
      : spv ? getFallbackBoxModelFromSpvVehicle(spv) : null;
    return {
      vehicleId,
      displayName: spv?.Name?.trim() || glb?.displayName || vehicleId,
      model,
      cameraIds: cameraIndex?.[vehicleId] || [],
    };
  }).sort((a, b) => a.displayName.localeCompare(b.displayName) || a.vehicleId.localeCompare(b.vehicleId));
}

type ResolveInput = {
  binding: GroupVehicleBinding | null;
  autoModel: VehicleViewportModel | null;
  autoVehicleId?: string | null;
  seatCameraConfig: ThirdPersonCameraBaseConfig | null;
  vehicles: ReferenceVehicle[];
  cameraIndex?: Record<string, string[]> | null;
  configs?: Record<string, ThirdPersonCameraBaseConfig>;
};

export function resolveGroupVehicleContext({ binding, autoModel, autoVehicleId, seatCameraConfig, vehicles, cameraIndex = getVehicleCameraIndex(), configs = getThirdPersonCameraConfigIndex() }: ResolveInput) {
  let model = autoModel;
  let cameraConfig = seatCameraConfig;
  let vehicleId = autoVehicleId || null;
  let cameraId: string | null = null;
  let needsSelection = false;
  let displayName = autoModel?.displayName || autoVehicleId || "";
  if (binding?.mode === "vehicle-context") {
    const vehicle = vehicles.find((entry) => entry.vehicleId === binding.vehicleId);
    const camera = resolveVehicleCamera(binding.vehicleId, binding.cameraId, cameraIndex, configs);
    vehicleId = binding.vehicleId;
    displayName = vehicle?.displayName || vehicleId;
    model = vehicle?.model || null;
    cameraConfig = camera.cameraConfig;
    cameraId = camera.cameraId;
    needsSelection = camera.needsSelection;
  }
  const ranges = getCameraControlRanges({ cameraConfig, bounds: model?.bounds });
  return {
    model, cameraConfig, vehicleId, cameraId, displayName, needsSelection,
    source: ranges.source === "datacore" ? binding?.mode === "vehicle-context" ? "manual-vehicle" : "seat" : ranges.source,
  };
}

export function setGroupVehicleBinding(bindings: GroupVehicleBindings, groupId: string, binding: GroupVehicleBinding | null): GroupVehicleBindings {
  if (!groupId) return bindings;
  const next = { ...bindings };
  if (binding) next[groupId] = binding;
  else delete next[groupId];
  return next;
}
