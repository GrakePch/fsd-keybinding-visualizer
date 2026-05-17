import { useEffect, useMemo, useState } from "react";
import type { SpvVehicleEntry } from "../types/vehicleModel";

const DEFAULT_SPV_VEHICLE_DATA_URL = "https://raw.githubusercontent.com/GrakePch/Fancy-SC-Ship-Info-2/main/src/data/vehicle-main-list.json";
const configuredSpvVehicleDataUrl = (import.meta.env.VITE_SPV_VEHICLE_DATA_URL as string | undefined) || DEFAULT_SPV_VEHICLE_DATA_URL;

export type SpvVehicleDataState = {
  loaded: boolean;
  vehicles: SpvVehicleEntry[];
  error: string | null;
};

let spvVehicleCache: SpvVehicleDataState | null = null;
let spvVehiclePromise: Promise<SpvVehicleEntry[]> | null = null;
let spvVehicleError: string | null = null;

export function useSpvVehicles() {
  const [state, setState] = useState<SpvVehicleDataState>(spvVehicleCache ?? { loaded: false, vehicles: [], error: null });

  useEffect(() => {
    let active = true;

    loadSpvVehicles().then((vehicles) => {
      if (active) {
        setState({ loaded: true, vehicles, error: spvVehicleError });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
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

function loadSpvVehicles() {
  if (!spvVehiclePromise) {
    spvVehiclePromise = fetch(configuredSpvVehicleDataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SPV vehicle data request failed: ${response.status}`);
        }

        return response.json() as Promise<SpvVehicleEntry[]>;
      })
      .then((vehicles) => {
        const validVehicles = Array.isArray(vehicles) ? vehicles.filter((vehicle) => Boolean(vehicle?.ClassName?.trim())) : [];
        spvVehicleError = null;
        spvVehicleCache = { loaded: true, vehicles: validVehicles, error: null };
        return validVehicles;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "SPV vehicle data request failed.";
        console.warn(error);
        spvVehicleError = message;
        spvVehicleCache = { loaded: true, vehicles: [], error: message };
        return [];
      });
  }

  return spvVehiclePromise;
}
