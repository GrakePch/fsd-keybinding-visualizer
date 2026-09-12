import { useMemo } from "react";
import vehicleData from "../data/spv_vehicle_main.json";
import type { SpvVehicleEntry } from "../types/vehicleModel";

const SPV_VEHICLES = (Array.isArray(vehicleData) ? vehicleData : []) as SpvVehicleEntry[];

export type SpvVehicleDataState = {
  loaded: boolean;
  vehicles: SpvVehicleEntry[];
  error: string | null;
};

export function useSpvVehicles() {
  return useMemo<SpvVehicleDataState>(() => ({ loaded: true, vehicles: SPV_VEHICLES, error: null }), []);
}

export function useSpvVehicleIndex(vehicles: SpvVehicleEntry[]) {
  return useMemo(() => getSpvVehicleIndex(vehicles), [vehicles]);
}

export function getSpvVehicleIndex(vehicles: SpvVehicleEntry[]) {
  return vehicles.reduce<Record<string, SpvVehicleEntry>>((index, vehicle) => {
    const className = vehicle.ClassName?.trim();
    if (className) {
      index[className] = vehicle;
    }
    return index;
  }, {});
}
