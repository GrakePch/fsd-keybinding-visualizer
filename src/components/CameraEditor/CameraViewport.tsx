import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import { shouldRenderCameraModelViewer, shouldShowViewportModelInfo } from "../../utils/cameraModelOverlay";
import { getCameraFrustumAspectRatio, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import { getCameraViewMarker } from "../../utils/cameraView";
import { getCameraPositionMarkers } from "../../utils/cameraViewport";
import CameraModelViewer from "./CameraModelViewer";
import styles from "./CameraViewport.module.css";

interface CameraViewportProps {
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  model: SelectableVehicleModel | null;
  isPreviewingModel: boolean;
  isCameraViewActive: boolean;
  frustumAspectRatioId: CameraFrustumAspectRatioId;
  onSelectSlot: (slotId: number) => void;
}

function CameraViewport({ selectedGroup, selectedSlot, model, isPreviewingModel, isCameraViewActive, frustumAspectRatioId, onSelectSlot }: CameraViewportProps) {
  const showModelInfo = shouldShowViewportModelInfo({ hasModel: Boolean(model), hasRenderableModel: Boolean(model?.src) });
  const cameraPositionMarkers = getCameraPositionMarkers(selectedGroup?.slots || []);
  const shouldRenderViewer = shouldRenderCameraModelViewer({ hasRenderableModel: Boolean(model?.src), markerCount: cameraPositionMarkers.length });
  const frustumAspectRatio = getCameraFrustumAspectRatio(frustumAspectRatioId);
  const cameraViewMarker = getCameraViewMarker({ isCameraViewActive, markers: cameraPositionMarkers, selectedSlotId: selectedSlot?.id });

  return (
    <section className={styles.viewport} aria-label="Camera 3D viewport">
      {shouldRenderViewer && <CameraModelViewer activeSlotId={selectedSlot?.id} cameraViewMarker={cameraViewMarker} frustumAspectRatio={frustumAspectRatio} markers={cameraPositionMarkers} model={model} onSelectSlot={onSelectSlot} />}
      {model && showModelInfo && (
        <div className={styles.modelInfo}>
          <span className={styles.previewLabel}>{isPreviewingModel ? "Preview Model" : "Loaded Model"}</span>
          <strong>{model.displayName}</strong>
          <span>{model.className || model.slug}</span>
          {selectedGroup && <span>Group: {selectedGroup.id}</span>}
          {selectedSlot && <span>Slot: {selectedSlot.id + 1}</span>}
        </div>
      )}
    </section>
  );
}

export default CameraViewport;
