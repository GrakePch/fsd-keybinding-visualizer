import seatsData from "../data/seats.json";
import type { SeatVehicleEntry } from "../types/vehicleModel";

const seats = Array.isArray(seatsData.seats) ? seatsData.seats.filter(isSeatVehicleEntry) : [];

export type SeatsDataState = {
  loaded: boolean;
  seats: SeatVehicleEntry[];
  error: string | null;
};

export function useSeatsData(): SeatsDataState {
  return { loaded: true, seats, error: null };
}

export function getSeatVehicleIndex(seats: SeatVehicleEntry[]) {
  return seats.reduce<Record<string, SeatVehicleEntry>>((index, seat) => {
    const groupId = seat.groupId.trim();
    if (groupId) index[groupId] = seat;
    return index;
  }, {});
}

function isSeatVehicleEntry(value: unknown): value is SeatVehicleEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as SeatVehicleEntry;
  return typeof entry.groupId === "string" && Array.isArray(entry.vehicleIds);
}
