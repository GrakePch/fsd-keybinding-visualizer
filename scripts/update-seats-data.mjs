import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] || ".cache/unforge/seats.json");
const outputPath = resolve(process.argv[3] || "src/data/seats.json");

const source = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(source.seats)) {
  throw new Error(`Expected a seats array in ${inputPath}`);
}

const seatsByGroupId = new Map();
for (const entry of source.seats) {
  const groupId = typeof entry?.groupId === "string" ? entry.groupId.trim() : "";
  const vehicleIds = Array.isArray(entry?.vehicleIds)
    ? [...new Set(entry.vehicleIds.filter((vehicleId) => typeof vehicleId === "string").map((vehicleId) => vehicleId.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right))
    : [];

  if (!groupId) continue;

  const existingVehicleIds = seatsByGroupId.get(groupId) || [];
  seatsByGroupId.set(groupId, [...new Set([...existingVehicleIds, ...vehicleIds])].sort((left, right) => left.localeCompare(right)));
}

const payload = {
  schemaVersion: 1,
  seats: [...seatsByGroupId.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, vehicleIds]) => ({ groupId, vehicleIds })),
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${payload.seats.length} camera seat groups to ${outputPath}`);
