import type { SelectableVehicleModel } from "../../../types/vehicleModel";
import type { CameraPositionMarker } from "../../../utils/cameraViewport";

export interface CameraModelViewerProps {
  activeSlotId?: number;
  cameraViewMarker: CameraPositionMarker | null;
  frustumAspectRatio: number;
  markers: CameraPositionMarker[];
  model: SelectableVehicleModel | null;
}

export type LoadState = "loading" | "ready" | "error";
