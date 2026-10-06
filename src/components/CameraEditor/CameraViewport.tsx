import { useMemo } from "react";
import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { ThirdPersonCameraBaseConfig } from "../../types/thirdPersonCamera";
import type { VehicleViewportModel } from "../../types/vehicleModel";
import { shouldRenderCameraModelViewer } from "../../utils/cameraModelOverlay";
import { getCameraFrustumAspectRatio, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import { getCameraControlRanges } from "../../utils/cameraControlRanges";
import { getCameraViewMarker } from "../../utils/cameraView";
import { getTargetOffsetBoundingBox, getCameraPositionMarkers } from "../../utils/cameraViewport";
import CameraModelViewer from "./CameraModelViewer";
import styles from "./CameraViewport.module.css";

interface CameraViewportProps {
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  model: VehicleViewportModel | null;
  cameraConfig: ThirdPersonCameraBaseConfig | null;
  referenceModelName: string | null;
  onSelectReferenceVehicle: () => void;
  isCameraViewActive: boolean;
  frustumAspectRatioId: CameraFrustumAspectRatioId;
  onSelectSlot: (slotId: number) => void;
}

function CameraViewport({ selectedGroup, selectedSlot, model, cameraConfig, referenceModelName, onSelectReferenceVehicle, isCameraViewActive, frustumAspectRatioId, onSelectSlot }: CameraViewportProps) {
  const cameraControlRanges = useMemo(
    () =>
      getCameraControlRanges({
        cameraConfig,
        bounds: model?.bounds,
      }),
    [cameraConfig, model?.bounds],
  );
  const cameraPositionMarkers = getCameraPositionMarkers(selectedGroup?.slots || [], { minimumDistance: cameraControlRanges.distance.recommended.min });
  const targetOffsetBounds = useMemo(
    () =>
      getTargetOffsetBoundingBox({
        x: cameraControlRanges.targetOffset.x.recommended,
        y: cameraControlRanges.targetOffset.y.recommended,
        z: cameraControlRanges.targetOffset.z.recommended,
      }),
    [cameraControlRanges],
  );
  const shouldRenderViewer = shouldRenderCameraModelViewer();
  const frustumAspectRatio = getCameraFrustumAspectRatio(frustumAspectRatioId);
  const cameraViewMarker = getCameraViewMarker({ isCameraViewActive, markers: cameraPositionMarkers, selectedSlotId: selectedSlot?.id });

  return (
    <section className={styles.viewport} aria-label="Camera 3D viewport">
      {shouldRenderViewer && <CameraModelViewer activeSlotId={selectedSlot?.id} cameraViewMarker={cameraViewMarker} frustumAspectRatio={frustumAspectRatio} maxCameraMarkerDistance={cameraControlRanges.distance.recommended.max} markers={cameraPositionMarkers} model={model} targetOffsetBounds={targetOffsetBounds} onSelectSlot={onSelectSlot} />}
      <div className={styles.referenceModel}>
        <span>{referenceModelName ? `Reference model: ${referenceModelName}` : "No reference model detected"}</span>
        <button type="button" aria-haspopup="dialog" disabled={!selectedGroup} onClick={onSelectReferenceVehicle}>
          {referenceModelName ? "Change" : "Select"}
        </button>
      </div>
    </section>
  );
}

export default CameraViewport;
