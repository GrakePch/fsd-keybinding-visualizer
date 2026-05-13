import { useMemo, useState } from "react";
import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import CameraNumberField from "./CameraNumberField";
import CameraSlotButtons from "./CameraSlotButtons";
import CameraVector3Editor from "./CameraVector3Editor";
import styles from "./CameraControlPanel.module.css";

interface CameraControlPanelProps {
  loadedModel: null;
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  selectedSlotId: number;
  onSelectSlot: (slotId: number) => void;
  onUpdateSlot: (slot: SavedCameraSlot) => void;
  onCreateSlot: () => void;
  onCopySlot: (sourceSlotId: number) => void;
}

function CameraControlPanel({ loadedModel, selectedGroup, selectedSlot, selectedSlotId, onSelectSlot, onUpdateSlot, onCreateSlot, onCopySlot }: CameraControlPanelProps) {
  const copySourceSlots = selectedGroup?.slots.filter((slot) => slot.id !== selectedSlotId) || [];
  const [copySourceSlotId, setCopySourceSlotId] = useState(0);
  const selectedCopySource = useMemo(() => copySourceSlots.find((slot) => slot.id === copySourceSlotId) || copySourceSlots[0], [copySourceSlotId, copySourceSlots]);

  const updateSlot = (patch: Partial<SavedCameraSlot>) => {
    if (!selectedSlot) return;
    onUpdateSlot({ ...selectedSlot, ...patch });
  };

  return (
    <aside className={styles.panel} aria-label="Camera controls">
      <section className={styles.section}>
        <h2 className={styles.heading}>Loaded Model</h2>
        {loadedModel ? null : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Camera Slots</h2>
        <CameraSlotButtons selectedGroup={selectedGroup} selectedSlotId={selectedSlotId} onSelectSlot={onSelectSlot} />
      </section>

      <section className={styles.editorSection}>
        {!selectedGroup && <p className={styles.emptyState}>Load savedviews.xml and select a group.</p>}

        {selectedGroup && !selectedSlot && (
          <div className={styles.emptySlotActions}>
            <p>Slot {selectedSlotId + 1} is empty.</p>
            <button type="button" onClick={onCreateSlot}>
              Create new camera
            </button>
            {copySourceSlots.length > 0 && (
              <div className={styles.copyControls}>
                <select value={selectedCopySource?.id ?? ""} onChange={(event) => setCopySourceSlotId(Number(event.target.value))}>
                  {copySourceSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      Slot {slot.id + 1}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => selectedCopySource && onCopySlot(selectedCopySource.id)}>
                  Copy from existing slot
                </button>
              </div>
            )}
          </div>
        )}

        {selectedSlot && (
          <div className={styles.fields}>
            <label className={styles.typeField}>
              <span>Type</span>
              <input readOnly value={selectedSlot.type} />
            </label>
            <CameraVector3Editor label="Target Offset" value={selectedSlot.targetOffset} onChange={(targetOffset) => updateSlot({ targetOffset })} />
            <CameraVector3Editor label="Rotation Angle" value={selectedSlot.cameraRotationAngle} onChange={(cameraRotationAngle) => updateSlot({ cameraRotationAngle })} />
            <CameraNumberField label="Distance" value={selectedSlot.distance} onChange={(distance) => updateSlot({ distance })} />
            <CameraNumberField label="Lens Size" value={selectedSlot.lensSize} onChange={(lensSize) => updateSlot({ lensSize })} />
            <CameraNumberField label="F-Stop" value={selectedSlot.fStop} onChange={(fStop) => updateSlot({ fStop })} />
          </div>
        )}
      </section>
    </aside>
  );
}

export default CameraControlPanel;
