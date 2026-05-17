import { useMemo } from "react";
import { CameraGizmo } from "./CameraGizmo";
import { getCameraFitFromBounds, getVehicleGridFromTargetOffsetBoundingBox } from "../../../utils/cameraViewport";
import { isVehicleFallbackBoxModel } from "../../../types/vehicleModel";
import { CameraMarkers } from "./cameraMarkers";
import type { CameraModelViewerProps, LoadState } from "./types";
import { VehicleGridLines } from "./vehicleGrid";
import { TargetOffsetBoundingBoxEdges } from "./targetOffsetBounds";
import { VehicleFallbackBox, VehicleModel } from "./vehicleModel";
import { ViewCamera } from "./viewCamera";

export function CameraScene({ activeSlotId, cameraViewMarker, frustumAspectRatio, maxCameraMarkerDistance, markers, model, targetOffsetBounds, onSelectSlot, onLoadProgress, onLoadStateChange }: CameraModelViewerProps & { onLoadProgress: (progress: number | null) => void; onLoadStateChange: (state: LoadState) => void }) {
  const cameraFit = useMemo(() => getCameraFitFromBounds(model?.bounds, { maxCameraMarkerDistance }), [maxCameraMarkerDistance, model?.bounds]);
  const vehicleGrid = useMemo(() => getVehicleGridFromTargetOffsetBoundingBox(targetOffsetBounds), [targetOffsetBounds]);

  return (
    <>
      <ViewCamera cameraFit={cameraFit} cameraViewMarker={cameraViewMarker} screenAspectRatio={frustumAspectRatio} />
      <hemisphereLight args={[0xffffff, 0x202030, 2.2]} />
      <directionalLight args={[0xffffff, 2.4]} position={[1, 3, 2]} />
      <directionalLight args={[0x8fb7ff, 1.2]} position={[-2, -1, 1]} />
      <VehicleGridLines grid={vehicleGrid} />
      {!cameraViewMarker && <TargetOffsetBoundingBoxEdges bounds={targetOffsetBounds} />}
      <VehicleModel model={model && !isVehicleFallbackBoxModel(model) ? model : null} onLoadProgress={onLoadProgress} onLoadStateChange={onLoadStateChange} />
      <VehicleFallbackBox model={isVehicleFallbackBoxModel(model) ? model : null} />
      <CameraMarkers activeSlotId={activeSlotId} frustumAspectRatio={frustumAspectRatio} hideMarkerGuides={Boolean(cameraViewMarker)} markers={markers} onSelectSlot={onSelectSlot} />
      {!cameraViewMarker && <CameraGizmo />}
    </>
  );
}
