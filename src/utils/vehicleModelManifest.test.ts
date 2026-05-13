import { describe, expect, it } from "vitest";
import { getSelectableVehicleModels } from "./vehicleModelManifest";
import type { VehicleModelManifest } from "../types/vehicleModel";

describe("vehicle model manifest selection", () => {
  it("excludes manifest entries without a renderable GLB", () => {
    const manifest: VehicleModelManifest = {
      baseUrl: "https://example.test/vehicles",
      models: {
        renderable: {
          className: "RENDERABLE_SHIP",
          spvName: "Renderable Ship",
          glb: "renderable/model.glb",
        },
        metadataOnly: {
          className: "METADATA_ONLY_SHIP",
          spvName: "Metadata Only Ship",
        },
        emptyGlb: {
          className: "EMPTY_GLB_SHIP",
          spvName: "Empty GLB Ship",
          glb: "",
        },
      },
    };

    const models = getSelectableVehicleModels(manifest);

    expect(models.map((model) => model.slug)).toEqual(["renderable"]);
    expect(models[0].src).toBe("/vehicle-models/renderable/model.glb");
  });
});
