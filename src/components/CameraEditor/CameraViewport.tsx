import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import styles from "./CameraViewport.module.css";

interface CameraViewportProps {
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
}

function CameraViewport({ selectedGroup, selectedSlot }: CameraViewportProps) {
  return (
    <section className={styles.viewport} aria-label="Camera 3D viewport">
      <div className={styles.grid} />
      {(selectedGroup || selectedSlot) && (
        <div className={styles.overlay}>
          {selectedGroup && <p>{selectedGroup.id}</p>}
          {selectedSlot && <p>Slot {selectedSlot.id + 1}</p>}
        </div>
      )}
    </section>
  );
}

export default CameraViewport;
