import { describe, expect, it } from "vitest";
import { getAutoSelectedSpvVehicle, getAutoSelectedVehicleModel, getBoundsFromSpvDimensions } from "./cameraAutoVehicleModel";
import type { SpvVehicleEntry, VehicleModelManifest } from "../types/vehicleModel";

function vehicle(className: string, name = className, dimensions = { Length: 10, Width: 4, Height: 2 }): SpvVehicleEntry {
  return {
    ClassName: className,
    Name: name,
    Dimensions: dimensions,
  };
}

const manifest: VehicleModelManifest = {
  baseUrl: "/vehicle-models",
  byClassName: {
    AEGS_Redeemer: "aegis-redeemer",
  },
  models: {
    "aegis-redeemer": {
      className: "AEGS_Redeemer",
      spvName: "Aegis Redeemer",
      glb: "aegis-redeemer.glb",
    },
    "misc-hull-b": {
      className: "MISC_Hull_B",
      spvName: "MISC Hull B",
      glb: "misc-hull-b.glb",
    },
  },
};

describe("camera auto vehicle model", () => {
  it("guesses the SPV vehicle whose class name appears in the camera group id", () => {
    const mercury = vehicle("CRUS_Star_Runner");
    const redeemer = vehicle("AEGS_Redeemer");

    expect(getAutoSelectedSpvVehicle("Seat (SCItem) - AEGS_Redeemer_SCItem_Support_Seat_Front", [mercury, redeemer])).toBe(redeemer);
  });

  it("falls back to the first SPV variant whose family class appears in the camera group id", () => {
    const a1 = vehicle("CRUS_Spirit_A1");
    const c1 = vehicle("CRUS_Spirit_C1");
    const e1 = vehicle("CRUS_Spirit_E1");

    expect(getAutoSelectedSpvVehicle("Seat (SCItem) - CRUS_Spirit_Seat_Pilot", [a1, c1, e1])).toBe(a1);
  });

  it("prefers the longest SPV class match instead of a shorter family match", () => {
    const hull = vehicle("MISC_Hull");
    const hullA = vehicle("MISC_Hull_A");

    expect(getAutoSelectedSpvVehicle("Seat (SCItem) - MISC_Hull_A_Seat_Pilot", [hull, hullA])).toBe(hullA);
  });

  it("resolves a guessed SPV class through manifest.byClassName", () => {
    const resolved = getAutoSelectedVehicleModel("Seat (SCItem) - AEGS_Redeemer_SCItem_Support_Seat_Front", [vehicle("AEGS_Redeemer")], manifest);

    expect(resolved?.visualKind).toBe("glb");
    expect(resolved?.className).toBe("AEGS_Redeemer");
    expect(resolved?.src.endsWith("/aegis-redeemer.glb")).toBe(true);
  });

  it("uses SPV dimensions as the stable bounds for a resolved GLB model", () => {
    const resolved = getAutoSelectedVehicleModel("Seat (SCItem) - AEGS_Redeemer_SCItem_Support_Seat_Front", [vehicle("AEGS_Redeemer", "Aegis Redeemer", { Length: 51, Width: 25, Height: 14 })], manifest);

    expect(resolved?.visualKind).toBe("glb");
    expect(resolved?.bounds?.size).toEqual([2500, 5100, 1400]);
    expect(resolved?.bounds?.radius).toBeCloseTo(Math.hypot(2500, 5100, 1400) / 2);
  });

  it("falls back to an SPV dimensions box when the guessed SPV class has no GLB match", () => {
    const resolved = getAutoSelectedVehicleModel("Seat (SCItem) - MISC_Hull_A_Seat_Pilot", [vehicle("MISC_Hull_A", "MISC Hull A", { Length: 22, Width: 8, Height: 6 })], manifest);

    expect(resolved?.visualKind).toBe("box");
    expect(resolved?.displayName).toBe("MISC Hull A");
    expect(resolved?.bounds.size).toEqual([800, 2200, 600]);
  });

  it("does not use a nearby model class when the guessed SPV class differs", () => {
    const resolved = getAutoSelectedVehicleModel("Seat (SCItem) - MISC_Hull_A_Seat_Pilot", [vehicle("MISC_Hull_A")], manifest);

    expect(resolved?.visualKind).toBe("box");
    expect(resolved?.className).toBe("MISC_Hull_A");
  });

  it("returns null when no SPV class matches the camera group id", () => {
    expect(getAutoSelectedVehicleModel("Player On Foot", [vehicle("CRUS_Star_Runner")], manifest)).toBeNull();
  });

  it("maps SPV dimensions to the Z-up viewport bounds", () => {
    expect(getBoundsFromSpvDimensions({ Length: 22, Width: 8, Height: 6 })).toEqual({
      center: [0, 0, 0],
      size: [800, 2200, 600],
      radius: Math.hypot(800, 2200, 600) / 2,
    });
  });
});
