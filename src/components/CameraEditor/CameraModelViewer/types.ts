import type { VehicleViewportModel } from "../../../types/vehicleModel";
import type { CameraPositionMarker } from "../../../utils/cameraViewport";

export interface CameraModelViewerProps {
  activeSlotId?: number;
  cameraViewMarker: CameraPositionMarker | null;
  frustumAspectRatio: number;
  markers: CameraPositionMarker[];
  model: VehicleViewportModel | null;
  onSelectSlot: (slotId: number) => void;
}

export type LoadState = "loading" | "ready" | "error";
