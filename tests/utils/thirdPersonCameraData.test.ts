import { describe, expect, it } from "vitest";
import type { ThirdPersonCameraBaseConfig } from "../../src/types/thirdPersonCamera";
import type { SeatVehicleEntry } from "../../src/types/vehicleModel";
import { getThirdPersonCameraConfigIndex, selectThirdPersonCameraConfigForSeat } from "../../src/utils/thirdPersonCameraData";

function config(distance: number): ThirdPersonCameraBaseConfig {
  return {
    distanceConfig: { initialDistance: distance, minDistance: distance / 2, maxDistance: distance * 2 },
    targetOffsetConfig: {
      targetPositionOffset: { x: 0, y: 0, z: 0 },
      userTargetOffsetMin: { x: -1, y: -1, z: -1 },
      userTargetOffsetMax: { x: 1, y: 1, z: 1 },
    },
  };
}

describe("third-person camera data", () => {
  it("loads the synced Fancy-Star-Data camera index", () => {
    const index = getThirdPersonCameraConfigIndex();

    expect(Object.keys(index).length).toBeGreaterThan(0);
    expect(index.ANVL_Carrack_ThirdPersonFlight?.distanceConfig).toMatchObject({ minDistance: 85, maxDistance: 220 });
  });

  it("prefers the camera matching the seat vehicle over unrelated candidates", () => {
    const hullA = config(20);
    const hullC = config(80);
    const unrelated = config(5);
    const seat: SeatVehicleEntry = {
      groupId: "Seat (SCItem) - MISC_Hull_A_Seat_Pilot",
      vehicleIds: ["MISC_Hull_A"],
      thirdPersonCameraIds: [
        "AEGS_Avenger_ThirdPersonFlight",
        "MISC_Hull_A_ThirdPersonFlight",
        "MISC_Hull_C_ThirdPersonFlight",
      ],
    };

    expect(selectThirdPersonCameraConfigForSeat(seat, {
      AEGS_Avenger_ThirdPersonFlight: unrelated,
      MISC_Hull_A_ThirdPersonFlight: hullA,
      MISC_Hull_C_ThirdPersonFlight: hullC,
    }, "MISC_Hull_A")).toBe(hullA);
  });

  it("falls back to the camera definition embedded in the seat group ID", () => {
    const starRunner = config(60);
    const starlifter = config(85);
    const seat: SeatVehicleEntry = {
      groupId: "Seat (SCItem) - CRUS_Star_Runner_Seat_Pilot",
      vehicleIds: [],
      thirdPersonCameraIds: ["CRUS_Starlifter_ThirdPersonFlight", "CRUS_Star_Runner_ThirdPersonFlight"],
    };

    expect(selectThirdPersonCameraConfigForSeat(seat, {
      CRUS_Starlifter_ThirdPersonFlight: starlifter,
      CRUS_Star_Runner_ThirdPersonFlight: starRunner,
    })).toBe(starRunner);
  });
});
