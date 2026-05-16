import { useMemo, useState } from "react";
import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import CameraLensZoomField from "./CameraLensZoomField";
import CameraNumberField from "./CameraNumberField";
import CameraSlotButtons from "./CameraSlotButtons";
import CameraVector3Editor from "./CameraVector3Editor";
import styles from "./CameraControlPanel.module.css";

interface CameraControlPanelProps {
  loadedModel: SelectableVehicleModel | null;
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  selectedSlotId: number;
  frustumAspectRatioId: CameraFrustumAspectRatioId;
  canEnterCameraView: boolean;
  isCameraViewActive: boolean;
  onToggleCameraView: () => void;
  onSelectSlot: (slotId: number) => void;
  onSelectModel: () => void;
  onSelectFrustumAspectRatio: (aspectRatioId: CameraFrustumAspectRatioId) => void;
  onUpdateSlot: (slot: SavedCameraSlot) => void;
  onCreateSlot: () => void;
  onCopySlot: (sourceSlotId: number) => void;
}

function CameraControlPanel({ loadedModel, selectedGroup, selectedSlot, selectedSlotId, frustumAspectRatioId, canEnterCameraView, isCameraViewActive, onToggleCameraView, onSelectSlot, onSelectModel, onSelectFrustumAspectRatio, onUpdateSlot, onCreateSlot, onCopySlot }: CameraControlPanelProps) {
  const copySourceSlots = useMemo(() => selectedGroup?.slots.filter((slot) => slot.id !== selectedSlotId) || [], [selectedGroup, selectedSlotId]);
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
        {loadedModel && (
          <div className={styles.loadedModelCard}>
            <strong>{loadedModel.displayName}</strong>
            <span>{loadedModel.className || loadedModel.slug}</span>
          </div>
        )}
        <button className={styles.modelButton} type="button" onClick={onSelectModel}>
          {loadedModel ? "Change model" : "Select model"}
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Camera Slots</h2>
        <CameraSlotButtons selectedGroup={selectedGroup} selectedSlotId={selectedSlotId} onSelectSlot={onSelectSlot} />
        <button className={styles.cameraViewButton} type="button" disabled={!canEnterCameraView && !isCameraViewActive} onClick={onToggleCameraView}>
          {isCameraViewActive ? "Exit Camera View" : "Enter Camera View"}
        </button>
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
            <CameraLensZoomField value={selectedSlot.lensSize} onChange={(lensSize) => updateSlot({ lensSize })} />
            <CameraNumberField label="F-Stop" value={selectedSlot.fStop} onChange={(fStop) => updateSlot({ fStop })} />
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Screen Aspect</h2>
        <div className={styles.aspectRatioOptions} role="radiogroup" aria-label="Screen aspect ratio">
          {CAMERA_FRUSTUM_ASPECT_RATIOS.map((option) => (
            <button
              key={option.id}
              className={`${styles.aspectRatioButton} ${frustumAspectRatioId === option.id ? styles.aspectRatioButtonActive : ""}`}
              type="button"
              role="radio"
              aria-checked={frustumAspectRatioId === option.id}
              onClick={() => onSelectFrustumAspectRatio(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default CameraControlPanel;
