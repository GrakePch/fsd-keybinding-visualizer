import { describe, expect, it } from "vitest";
import { getAutoSelectedVehicleModel } from "./cameraAutoVehicleModel";
import type { SelectableVehicleModel } from "../types/vehicleModel";

function model(slug: string, className: string): SelectableVehicleModel {
  return {
    slug,
    className,
    displayName: slug,
    glb: `${slug}.glb`,
    src: `/vehicle-models/${slug}.glb`,
  };
}

describe("getAutoSelectedVehicleModel", () => {
  it("selects the first model whose class name appears in the camera group id", () => {
    const mercury = model("crusader-mercury", "CRUS_Star_Runner");
    const redeemer = model("aegis-redeemer", "AEGS_Redeemer");

    expect(getAutoSelectedVehicleModel("Seat (SCItem) - AEGS_Redeemer_SCItem_Support_Seat_Front", [mercury, redeemer])).toBe(redeemer);
  });

  it("falls back to the first variant whose family class appears in the camera group id", () => {
    const a1 = model("crusader-a1-spirit", "CRUS_Spirit_A1");
    const c1 = model("crusader-c1-spirit", "CRUS_Spirit_C1");
    const e1 = model("crusader-e1-spirit", "CRUS_Spirit_E1");

    expect(getAutoSelectedVehicleModel("Seat (SCItem) - CRUS_Spirit_Seat_Pilot", [a1, c1, e1])).toBe(a1);
  });

  it("returns null when no model class matches the camera group id", () => {
    expect(getAutoSelectedVehicleModel("Player On Foot", [model("crusader-mercury", "CRUS_Star_Runner")])).toBeNull();
  });
});
