import { useMemo, useState } from "react";
import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { VehicleViewportModel } from "../../types/vehicleModel";
import { isVehicleFallbackBoxModel } from "../../types/vehicleModel";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import { getCameraControlRanges, type CameraControlAxisRange, type CameraControlRangeSource } from "../../utils/cameraControlRanges";
import CameraLensZoomField from "./CameraLensZoomField";
import CameraNumberField from "./CameraNumberField";
import CameraSliderNumberField from "./CameraSliderNumberField";
import CameraSlotButtons from "./CameraSlotButtons";
import CameraVector3Editor from "./CameraVector3Editor";
import styles from "./CameraControlPanel.module.css";

interface CameraControlPanelProps {
  loadedModel: VehicleViewportModel | null;
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

function getCameraControlRangeNote(source: CameraControlRangeSource, range: CameraControlAxisRange) {
  const sourceLabel = source === "precise" ? "Tested range" : source === "inferred" ? "Estimated from model size" : "Default range";
  return range.isCurrentValueOutsideRecommendedRange ? `${sourceLabel}: outside recommended range` : sourceLabel;
}

function CameraControlPanel({ loadedModel, selectedGroup, selectedSlot, selectedSlotId, frustumAspectRatioId, canEnterCameraView, isCameraViewActive, onToggleCameraView, onSelectSlot, onSelectModel, onSelectFrustumAspectRatio, onUpdateSlot, onCreateSlot, onCopySlot }: CameraControlPanelProps) {
  const copySourceSlots = useMemo(() => selectedGroup?.slots.filter((slot) => slot.id !== selectedSlotId) || [], [selectedGroup, selectedSlotId]);
  const [copySourceSlotId, setCopySourceSlotId] = useState(0);
  const selectedCopySource = useMemo(() => copySourceSlots.find((slot) => slot.id === copySourceSlotId) || copySourceSlots[0], [copySourceSlotId, copySourceSlots]);
  const cameraControlRanges = useMemo(
    () =>
      getCameraControlRanges({
        className: loadedModel?.spvClassName || loadedModel?.className,
        bounds: loadedModel?.bounds,
        currentTargetOffset: selectedSlot?.targetOffset,
        currentDistance: selectedSlot?.distance,
      }),
    [loadedModel?.bounds, loadedModel?.className, loadedModel?.spvClassName, selectedSlot?.distance, selectedSlot?.targetOffset],
  );
  const cameraControlTargetOffsetRangeNotes = {
    x: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.x),
    y: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.y),
    z: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.z),
  };
  const cameraControlDistanceRangeNote = getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.distance);

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
            {isVehicleFallbackBoxModel(loadedModel) && <span>SPV dimensions fallback</span>}
          </div>
        )}
        <button className={styles.modelButton} type="button" onClick={onSelectModel}>
          {loadedModel ? "Change model" : "Select model"}
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Camera Slots</h2>
        <CameraSlotButtons selectedGroup={selectedGroup} selectedSlotId={selectedSlotId} onSelectSlot={onSelectSlot} />
        <button
          className={`${styles.cameraViewButton} ${isCameraViewActive ? styles.cameraViewButtonActive : ""}`}
          type="button"
          disabled={!canEnterCameraView && !isCameraViewActive}
          onClick={onToggleCameraView}
        >
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
            <CameraVector3Editor label="Target Offset" value={selectedSlot.targetOffset} variant="rangeSlider" ranges={cameraControlRanges.targetOffset} rangeNotes={cameraControlTargetOffsetRangeNotes} onChange={(targetOffset) => updateSlot({ targetOffset })} />
            <CameraVector3Editor
              label="Rotation Angle"
              value={selectedSlot.cameraRotationAngle}
              fields={[
                { axis: "x", label: "Pitch" },
                { axis: "y", label: "Roll" },
                { axis: "z", label: "Yaw" },
              ]}
              variant="angleSlider"
              onChange={(cameraRotationAngle) => updateSlot({ cameraRotationAngle })}
            />
            <CameraSliderNumberField label="Distance" value={selectedSlot.distance} range={cameraControlRanges.distance} rangeNote={cameraControlDistanceRangeNote} onChange={(distance) => updateSlot({ distance })} />
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
