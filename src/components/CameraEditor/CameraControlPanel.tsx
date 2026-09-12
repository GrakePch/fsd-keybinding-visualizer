import { useMemo, useState } from "react";
import Icon from "@mdi/react";
import { mdiCamera, mdiDeleteOutline, mdiRestore } from "@mdi/js";
import ConfirmModal from "../ConfirmModal";
import { SavedCameraSlot, SavedViewGroup } from "../../types/savedViews";
import type { ThirdPersonCameraBaseConfig } from "../../types/thirdPersonCamera";
import type { VehicleViewportModel } from "../../types/vehicleModel";
import type { resolveGroupVehicleContext } from "../../utils/cameraVehicleBinding";
import { isVehicleFallbackBoxModel } from "../../types/vehicleModel";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import { getCameraControlRanges, type CameraControlAxisRange, type CameraControlRangeSource } from "../../utils/cameraControlRanges";
import { SEAT_VIEW_PRESET_SLOT_IDS } from "../../utils/seatViewPreset";
import CameraLensZoomField from "./CameraLensZoomField";
import CameraNumberField from "./CameraNumberField";
import CameraSliderNumberField from "./CameraSliderNumberField";
import CameraSlotButtons from "./CameraSlotButtons";
import CameraVector3Editor from "./CameraVector3Editor";
import styles from "./CameraControlPanel.module.css";

interface CameraControlPanelProps {
  loadedModel: VehicleViewportModel | null;
  cameraConfig: ThirdPersonCameraBaseConfig | null;
  referenceContext: ReturnType<typeof resolveGroupVehicleContext> | null;
  hasManualBinding: boolean;
  onSelectReferenceVehicle: () => void;
  onRestoreAutomaticBinding: () => void;
  selectedGroup?: SavedViewGroup;
  selectedSlot?: SavedCameraSlot;
  selectedSlotId: number;
  frustumAspectRatioId: CameraFrustumAspectRatioId;
  canEnterCameraView: boolean;
  isCameraViewActive: boolean;
  onToggleCameraView: () => void;
  onSelectSlot: (slotId: number) => void;
  onSelectFrustumAspectRatio: (aspectRatioId: CameraFrustumAspectRatioId) => void;
  onUpdateSlot: (slot: SavedCameraSlot) => void;
  onCreateSlot: () => void;
  onCopySlot: (sourceSlotId: number) => void;
  onSetEmptyToPreset: () => void;
  onResetAllToPreset: () => void;
  onDeleteSelectedSlot: () => void;
}

function getCameraControlRangeNote(source: CameraControlRangeSource, range: CameraControlAxisRange) {
  const sourceNote = source === "datacore" ? "This range comes from game data." : source === "inferred" ? "This range is estimated from model size." : "This range uses default values.";
  return range.isCurrentValueOutsideRecommendedRange ? `${sourceNote}\nCurrent value is outside the range.` : sourceNote;
}

const mdiScShip =
  "M16,16.813l-0,0.937l1.688,2.125l-0,2.125l-3.563,-2l0,-3.687l-0.875,-0.75l-0.438,1.687l-1.624,0l-0.438,-1.687l-0.875,0.75l0,3.687l-3.563,2l0.001,-2.125l1.687,-2.125l0,-0.937l-1.313,-0.875l-2.562,2.5l0,-2.875l5.188,-6.75l1.625,-6.813l2.125,-0l1.625,6.813l5.187,6.75l0,2.875l-2.562,-2.5l-1.313,0.875Z";

function CameraControlPanel({ loadedModel, cameraConfig, referenceContext, hasManualBinding, onSelectReferenceVehicle, onRestoreAutomaticBinding, selectedGroup, selectedSlot, selectedSlotId, frustumAspectRatioId, canEnterCameraView, isCameraViewActive, onToggleCameraView, onSelectSlot, onSelectFrustumAspectRatio, onUpdateSlot, onCreateSlot, onCopySlot, onSetEmptyToPreset, onResetAllToPreset, onDeleteSelectedSlot }: CameraControlPanelProps) {
  const copySourceSlots = useMemo(() => selectedGroup?.slots.filter((slot) => slot.id !== selectedSlotId) || [], [selectedGroup, selectedSlotId]);
  const [copySourceSlotId, setCopySourceSlotId] = useState(0);
  const [confirmation, setConfirmation] = useState<"reset" | "delete" | null>(null);
  const selectedCopySource = useMemo(() => copySourceSlots.find((slot) => slot.id === copySourceSlotId) || copySourceSlots[0], [copySourceSlotId, copySourceSlots]);
  const cameraControlRanges = useMemo(
    () =>
      getCameraControlRanges({
        cameraConfig,
        bounds: loadedModel?.bounds,
        currentTargetOffset: selectedSlot?.targetOffset,
        currentDistance: selectedSlot?.distance,
      }),
    [cameraConfig, loadedModel?.bounds, selectedSlot?.distance, selectedSlot?.targetOffset],
  );
  const cameraControlTargetOffsetRangeNotes = {
    x: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.x),
    y: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.y),
    z: getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.targetOffset.z),
  };
  const cameraControlDistanceRangeNote = getCameraControlRangeNote(cameraControlRanges.source, cameraControlRanges.distance);
  const hasEmptyPresetSlots = Boolean(selectedGroup && SEAT_VIEW_PRESET_SLOT_IDS.some((slotId) => !selectedGroup.slots.some((slot) => slot.id === slotId)));

  const updateSlot = (patch: Partial<SavedCameraSlot>) => {
    if (!selectedSlot) return;
    onUpdateSlot({ ...selectedSlot, ...patch });
  };

  return (
    <aside className={styles.panel} aria-label="Camera controls">
      <section className={styles.section}>
        <h2 className={styles.heading}>{referenceContext ? "Reference Vehicle" : "Loaded Model"}</h2>
        {loadedModel && !referenceContext && (
          <div className={styles.loadedModelCard}>
            <strong>{loadedModel.displayName}</strong>
            <span>{loadedModel.className || loadedModel.slug}</span>
            {isVehicleFallbackBoxModel(loadedModel) && <span>SPV dimensions fallback</span>}
          </div>
        )}
        {selectedGroup && (
          <div className={styles.referenceControls}>
            {referenceContext ? (
              <div className={styles.loadedModelCard}>
                <strong>Reference: {referenceContext.displayName}</strong>
                <span>{referenceContext.vehicleId} · {hasManualBinding ? "Manually assigned" : "Automatically assigned"}</span>
                {referenceContext.cameraId && <span>{referenceContext.cameraId}</span>}
                {referenceContext.needsSelection && <span>Camera selection is required. Choose a configuration to restore game ranges.</span>}
                <span>{isVehicleFallbackBoxModel(referenceContext.model) ? "SPV dimensions fallback" : referenceContext.model ? "3D model" : "No model available"}</span>
                <span>Ranges: {referenceContext.cameraConfig ? "Game data" : referenceContext.source === "inferred" ? "Estimated from vehicle size" : "Defaults"}</span>
                <span>Distance: {cameraControlRanges.distance.recommended.min}–{cameraControlRanges.distance.recommended.max}</span>
              </div>
            ) : !cameraConfig && (
              <p className={styles.referenceNote}>This group has no camera configuration. Assign a reference vehicle to use its model and camera ranges.</p>
            )}
            <button className={styles.modelButton} type="button" onClick={onSelectReferenceVehicle}>
              <Icon className={styles.modelButtonIcon} path={mdiScShip} size="1rem" aria-hidden="true" />
              {referenceContext ? "Change reference vehicle" : "Assign reference vehicle"}
            </button>
        {hasManualBinding && <button className={styles.modelButton} type="button" onClick={onRestoreAutomaticBinding}>Restore automatic association</button>}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Camera Slots</h2>
        <CameraSlotButtons selectedGroup={selectedGroup} selectedSlotId={selectedSlotId} onSelectSlot={onSelectSlot} />
        <button
          className={`${styles.cameraViewButton} ${isCameraViewActive ? `${styles.cameraViewButtonActive} buttonNormal` : ""}`}
          type="button"
          disabled={!canEnterCameraView && !isCameraViewActive}
          onClick={onToggleCameraView}
        >
          <Icon className={styles.cameraViewButtonIcon} path={mdiCamera} size="1rem" aria-hidden="true" />
          {isCameraViewActive ? "Exit Camera View" : "Enter Camera View"}
        </button>
        <div className={styles.presetActions}>
          <button type="button" disabled={!selectedGroup || !hasEmptyPresetSlots} onClick={onSetEmptyToPreset}>
            Set Empty to Preset
          </button>
          <button type="button" disabled={!selectedGroup} onClick={() => setConfirmation("reset")}>
            <Icon path={mdiRestore} size="1rem" aria-hidden="true" />
            Reset All to Preset
          </button>
        </div>
      </section>

      <section className={styles.editorSection}>
        {!selectedGroup && <p className={styles.emptyState}>Load savedviews.xml and select a group.</p>}

        {selectedGroup && !selectedSlot && (
          <div className={styles.emptySlotActions}>
            <p>Slot {selectedSlotId + 1} is empty.</p>
            <button className="buttonAccent" type="button" onClick={onCreateSlot}>
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
              className={`${styles.aspectRatioButton} ${frustumAspectRatioId === option.id ? `${styles.aspectRatioButtonActive} buttonHighlighted` : ""}`}
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

      <section className={styles.deleteSection}>
        <button className={styles.deleteButton} type="button" disabled={!selectedSlot} onClick={() => setConfirmation("delete")}>
          <Icon path={mdiDeleteOutline} size="1rem" aria-hidden="true" />
          Delete Selected Slot
        </button>
      </section>

      {confirmation && (
        <ConfirmModal
          title={confirmation === "reset" ? "Reset all slots?" : "Delete selected slot?"}
          description={confirmation === "reset" ? "This will replace every slot in the selected group with the Seat View Preset. Existing camera values will be lost." : `Slot ${selectedSlotId + 1} will be removed from the selected group.`}
          confirmLabel={confirmation === "reset" ? "Reset all" : "Delete slot"}
          confirmTone={confirmation === "reset" ? "accent" : "danger"}
          confirmIconPath={confirmation === "reset" ? mdiRestore : mdiDeleteOutline}
          onConfirm={() => {
            if (confirmation === "reset") onResetAllToPreset();
            else onDeleteSelectedSlot();
            setConfirmation(null);
          }}
          onClose={() => setConfirmation(null)}
        />
      )}
    </aside>
  );
}

export default CameraControlPanel;
