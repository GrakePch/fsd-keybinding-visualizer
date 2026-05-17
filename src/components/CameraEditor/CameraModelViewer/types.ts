import type { VehicleViewportModel } from "../../../types/vehicleModel";
import type { CameraPositionMarker, TargetOffsetBoundingBox } from "../../../utils/cameraViewport";

export interface CameraModelViewerProps {
  activeSlotId?: number;
  cameraViewMarker: CameraPositionMarker | null;
  frustumAspectRatio: number;
  maxCameraMarkerDistance: number;
  markers: CameraPositionMarker[];
  model: VehicleViewportModel | null;
  targetOffsetBounds: TargetOffsetBoundingBox | null;
  onSelectSlot: (slotId: number) => void;
}

export type LoadState = "loading" | "ready" | "error";
