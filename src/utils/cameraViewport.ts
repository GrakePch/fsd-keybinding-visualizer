import type { VehicleModelBounds } from "../types/vehicleModel";

export type CameraFit = {
  target: [number, number, number];
  cameraPosition: [number, number, number];
  near: number;
  far: number;
};

const DEFAULT_CAMERA_FIT: CameraFit = {
  target: [0, 0, 0],
  cameraPosition: [0, 60, 240],
  near: 0.1,
  far: 2000,
};

export function getCameraFitFromBounds(bounds: VehicleModelBounds | null | undefined): CameraFit {
  if (!bounds || !isFinite(bounds.radius) || bounds.radius <= 0) {
    return DEFAULT_CAMERA_FIT;
  }

  const [centerX, centerY, centerZ] = bounds.center;
  const radius = bounds.radius;

  return {
    target: [centerX, centerY, centerZ],
    cameraPosition: [centerX, centerY + radius * 0.5, centerZ + radius * 2.4],
    near: Math.max(radius / 100, 0.1),
    far: radius * 10,
  };
}
