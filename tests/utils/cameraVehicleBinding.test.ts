import { describe, expect, it } from "vitest";
import { getReferenceVehicles, resolveGroupVehicleContext, setGroupVehicleBinding } from "../../src/utils/cameraVehicleBinding";
import { getThirdPersonCameraConfigIndex, getVehicleCameraIndex, parseVehicleCameraIndex, resolveVehicleCamera } from "../../src/utils/thirdPersonCameraData";
import { getCameraControlRanges } from "../../src/utils/cameraControlRanges";
import type { VehicleModelManifest } from "../../src/types/vehicleModel";

const configs = getThirdPersonCameraConfigIndex();
const carrackId = "ANVL_Carrack_ThirdPersonFlight";
const piscesId = "ANVL_Pisces_ThirdPersonFlight";
const manifest: VehicleModelManifest = {
  byClassName: { VariantA: "shared", VariantB: "shared" },
  models: { shared: { className: "VariantA", glb: "shared.glb", spvName: "Shared model" }, anonymous: { glb: "anonymous.glb" } },
};
const spvVehicles = [{ ClassName: "VariantB", Name: "Variant B", Dimensions: { Length: 30, Width: 10, Height: 8 } }];
const index = { VariantA: [piscesId], VariantB: [carrackId], NoModel: [carrackId], Ambiguous: [piscesId, carrackId] };
const vehicles = getReferenceVehicles(manifest, spvVehicles, index);
const input = { autoModel: null, autoVehicleId: "Original", seatCameraConfig: configs[piscesId], vehicles, cameraIndex: index, configs };

describe("reference vehicle cameras", () => {
  it("consumes the official vehicle index and preserves ambiguous candidates", () => {
    expect(getVehicleCameraIndex()?.ANVL_Carrack).toContain(carrackId);
    const result = resolveVehicleCamera("Ambiguous", undefined, index, configs);
    expect(result.cameraIds).toHaveLength(2);
    expect(result.needsSelection).toBe(true);
    expect(result.cameraConfig).toBeNull();
    expect(resolveVehicleCamera("Ambiguous", carrackId, index, configs).cameraConfig).toBe(configs[carrackId]);
  });

  it("uses the SPV main list as the manual reference vehicle allowlist", () => {
    expect(vehicles.map((entry) => entry.vehicleId)).toEqual(["VariantB"]);
    expect(vehicles.some((entry) => entry.vehicleId === "NoModel")).toBe(false);
    expect(vehicles.some((entry) => entry.vehicleId === "Ambiguous")).toBe(false);
  });

  it("requires a fresh choice for stale selections and rejects unrelated configs", () => {
    const result = resolveVehicleCamera("VariantA", carrackId, index, configs);
    expect(result.needsSelection).toBe(true);
    expect(result.cameraConfig).toBeNull();
    expect(resolveVehicleCamera("toString", undefined, index, configs).cameraIds).toEqual([]);
  });

  it("supports legacy data without guessing associations and drops dangling references", () => {
    expect(parseVehicleCameraIndex({ schemaVersion: 2, cameras: [] }, configs)).toBeNull();
    expect(parseVehicleCameraIndex({ schemaVersion: 3, cameraIdsByVehicleId: { A: [carrackId, "missing"] } }, configs)).toEqual({ A: [carrackId] });
    expect(resolveVehicleCamera("VariantA", undefined, null, configs).indexAvailable).toBe(false);
  });

  it("keeps vehicle identity when variants share a model and applies variant dimensions", () => {
    const variant = vehicles.find((entry) => entry.vehicleId === "VariantB")!;
    expect(variant.model?.slug).toBe("shared");
    expect(variant.model?.bounds?.size).toEqual([1000, 3000, 800]);
    const result = resolveGroupVehicleContext({ ...input, binding: { mode: "vehicle-context", vehicleId: "VariantB" } });
    expect(result.vehicleId).toBe("VariantB");
    expect(result.cameraConfig).toBe(configs[carrackId]);
    expect(result.source).toBe("manual-vehicle");
    const ranges = getCameraControlRanges({ cameraConfig: result.cameraConfig, bounds: result.model?.bounds });
    expect(ranges.distance.recommended).toEqual({ min: 85, max: 220 });
    expect(ranges.targetOffset.y.recommended).toEqual({ min: -150, max: 200 });
  });

  it("keeps an automatically matched vehicle as a reference context", () => {
    const result = resolveGroupVehicleContext({ ...input, binding: null, autoVehicleId: "VariantA", seatCameraConfig: configs[piscesId] });
    expect(result.vehicleId).toBe("VariantA");
    expect(result.cameraConfig).toBe(configs[piscesId]);
    expect(result.source).toBe("seat");
  });

  it("applies cameras without models and uses dimension fallback without GLB", () => {
    const result = resolveGroupVehicleContext({ ...input, binding: { mode: "vehicle-context", vehicleId: "NoModel" } });
    expect(result.model).toBeNull();
    expect(result.cameraConfig).toBe(configs[carrackId]);
    const fallback = getReferenceVehicles(null, spvVehicles, index).find((entry) => entry.vehicleId === "VariantB")!;
    expect(fallback.model?.visualKind).toBe("box");
  });

  it("does not reuse the original seat camera when the manual vehicle has none", () => {
    const result = resolveGroupVehicleContext({ ...input, binding: { mode: "vehicle-context", vehicleId: "Missing" } });
    expect(result.cameraConfig).toBeNull();
    expect(result.model).toBeNull();
    expect(result.source).toBe("default");
  });

  it("keeps group bindings isolated and clears one without mutating the original state", () => {
    const a = setGroupVehicleBinding({}, "A", { mode: "vehicle-context", vehicleId: "VariantA" });
    const b = setGroupVehicleBinding(a, "B", { mode: "vehicle-context", vehicleId: "VariantB" });
    const remaining = setGroupVehicleBinding(b, "A", null);
    expect(Object.keys(a)).toEqual(["A"]);
    expect(Object.keys(b)).toEqual(["A", "B"]);
    expect(Object.keys(remaining)).toEqual(["B"]);
    expect(resolveGroupVehicleContext({ ...input, binding: null }).cameraConfig).toBe(input.seatCameraConfig);
  });
});
