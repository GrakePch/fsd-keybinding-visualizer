import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import CameraModelViewer from "./CameraModelViewer";
import styles from "./CameraViewport.module.css";

interface CameraViewportProps {
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  model: SelectableVehicleModel | null;
  isPreviewingModel: boolean;
}

function CameraViewport({ selectedGroup, selectedSlot, model, isPreviewingModel }: CameraViewportProps) {
  return (
    <section className={styles.viewport} aria-label="Camera 3D viewport">
      <div className={styles.grid} />
      {model?.src && <CameraModelViewer model={model} />}
      {model && (
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
