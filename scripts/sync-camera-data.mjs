import { copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const DEFAULT_SOURCE_DIR = ".cache/fancy-star-data";
const DEFAULT_TARGET_DIR = "src/data";

const sourceFiles = {
  seats: "data/datacore/seats.json",
  cameras: "data/datacore/third_person_cameras.json",
  vehicles: "data/spviewer/live/json/vehicle-main-list.json",
};

const targetFiles = {
  seats: "seats.json",
  cameras: "third_person_cameras.json",
  vehicles: "spv_vehicle_main.json",
};

export async function syncCameraData({ sourceDir = DEFAULT_SOURCE_DIR, targetDir = DEFAULT_TARGET_DIR } = {}) {
  const source = await readSourcePayloads(resolve(sourceDir));
  const vehicles = normalizeVehicles(source.vehicles, sourceFiles.vehicles);

  validateCameraData({ seats: source.seats, cameras: source.cameras, vehicles });

  await copyFile(resolve(sourceDir, sourceFiles.seats), resolve(targetDir, targetFiles.seats));
  await copyFile(resolve(sourceDir, sourceFiles.cameras), resolve(targetDir, targetFiles.cameras));
  await writeFile(resolve(targetDir, targetFiles.vehicles), `${JSON.stringify(vehicles)}\n`, "utf8");

  console.log(
    `Synced ${vehicles.length} vehicles, ${source.seats.seats.length} seats and ${source.cameras.cameras.length} third-person cameras from Fancy-Star-Data.`,
  );
}

export function normalizeVehicles(source, sourceName = "vehicle-main-list.json") {
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error(`${sourceName} is not a non-empty vehicle-main-list array`);
  }

  return source.map((vehicle, index) => {
    const dimensions = vehicle?.Dimensions;
    const dimensionValues = [dimensions?.Length, dimensions?.Width, dimensions?.Height];
    if (
      typeof vehicle?.ClassName !== "string" ||
      !vehicle.ClassName.trim() ||
      typeof vehicle?.Name !== "string" ||
      !dimensionValues.every((value) => isPositiveFiniteNumber(value))
    ) {
      throw new Error(`${sourceName} has invalid vehicle metadata at index ${index}`);
    }

    return { ClassName: vehicle.ClassName, Name: vehicle.Name, Dimensions: dimensions };
  });
}

export function validateCameraData({ seats, cameras, vehicles }) {
  if (seats?.schemaVersion !== 2 || !Array.isArray(seats.seats)) {
    throw new Error(`${sourceFiles.seats} is not the Fancy-Star-Data seat format`);
  }
  if (cameras?.schemaVersion !== 3 || !Array.isArray(cameras.cameras)) {
    throw new Error(`${sourceFiles.cameras} is not the Fancy-Star-Data third-person camera format`);
  }

  const vehicleIds = new Set();
  for (const [index, vehicle] of vehicles.entries()) {
    if (
      typeof vehicle?.ClassName !== "string" ||
      !vehicle.ClassName.trim() ||
      typeof vehicle?.Name !== "string" ||
      ![vehicle.Dimensions?.Length, vehicle.Dimensions?.Width, vehicle.Dimensions?.Height].every((value) => isFiniteNumber(value))
    ) {
      throw new Error(`${targetFiles.vehicles} has invalid vehicle metadata at index ${index}`);
    }
    if (vehicleIds.has(vehicle.ClassName)) {
      throw new Error(`${targetFiles.vehicles} contains duplicate vehicle ID ${vehicle.ClassName}`);
    }
    vehicleIds.add(vehicle.ClassName);
  }

  const cameraIds = new Set();
  for (const [index, camera] of cameras.cameras.entries()) {
    const distance = camera?.baseConfig?.distanceConfig;
    const targetOffset = camera?.baseConfig?.targetOffsetConfig;
    if (typeof camera?.cameraId !== "string" || !camera.cameraId) {
      throw new Error(`${sourceFiles.cameras} has an invalid camera ID at index ${index}`);
    }
    if (![distance?.initialDistance, distance?.minDistance, distance?.maxDistance].every((value) => isFiniteNumber(value))) {
      throw new Error(`${sourceFiles.cameras} has an invalid distance config at index ${index}`);
    }
    if (
      ![targetOffset?.targetPositionOffset, targetOffset?.userTargetOffsetMin, targetOffset?.userTargetOffsetMax].every(validVector)
    ) {
      throw new Error(`${sourceFiles.cameras} has an invalid target offset config at index ${index}`);
    }
    if (
      distance.minDistance < 0 ||
      distance.minDistance > distance.maxDistance ||
      ["x", "y", "z"].some((axis) => targetOffset.userTargetOffsetMin[axis] > targetOffset.userTargetOffsetMax[axis])
    ) {
      throw new Error(`${sourceFiles.cameras} has an invalid range at index ${index}`);
    }
    if (cameraIds.has(camera.cameraId)) {
      throw new Error(`${sourceFiles.cameras} contains duplicate camera ID ${camera.cameraId}`);
    }
    cameraIds.add(camera.cameraId);
  }

  const vehicleIndex = cameras.cameraIdsByVehicleId;
  if (!vehicleIndex || typeof vehicleIndex !== "object" || Array.isArray(vehicleIndex)) {
    throw new Error(`${sourceFiles.cameras} is missing cameraIdsByVehicleId`);
  }
  for (const [vehicleId, ids] of Object.entries(vehicleIndex)) {
    if (
      !vehicleId.trim() ||
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => typeof id !== "string" || !cameraIds.has(id)) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error(`${sourceFiles.cameras} has invalid camera references for ${vehicleId}`);
    }
  }

  for (const [index, seat] of seats.seats.entries()) {
    if (typeof seat?.groupId !== "string" || !Array.isArray(seat.vehicleIds) || !Array.isArray(seat.thirdPersonCameraIds)) {
      throw new Error(`${sourceFiles.seats} has an invalid seat entry at index ${index}`);
    }
    if ([...seat.vehicleIds, ...seat.thirdPersonCameraIds].some((id) => typeof id !== "string")) {
      throw new Error(`${sourceFiles.seats} has a non-string ID at index ${index}`);
    }
    const missingCameraId = seat.thirdPersonCameraIds.find((cameraId) => !cameraIds.has(cameraId));
    if (missingCameraId) {
      throw new Error(`${sourceFiles.seats} references missing third-person camera ${missingCameraId}`);
    }
  }
}

async function readSourcePayloads(sourceDir) {
  const [seats, cameras, vehicles] = await Promise.all(
    Object.values(sourceFiles).map(async (relativePath) => JSON.parse(await readFile(resolve(sourceDir, relativePath), "utf8"))),
  );

  return { seats, cameras, vehicles };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

function validVector(value) {
  return value && ["x", "y", "z"].every((axis) => isFiniteNumber(value[axis]));
}

function parseArgs(argv) {
  const options = { sourceDir: DEFAULT_SOURCE_DIR, targetDir: DEFAULT_TARGET_DIR };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--source-dir" && value) {
      options.sourceDir = value;
      index += 1;
    } else if (argument === "--target-dir" && value) {
      options.targetDir = value;
      index += 1;
    } else if (argument === "--help") {
      console.log("Usage: node scripts/sync-camera-data.mjs [--source-dir <path>] [--target-dir <path>]");
      return null;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const options = parseArgs(process.argv.slice(2));
  if (options) {
    await syncCameraData(options);
  }
}
