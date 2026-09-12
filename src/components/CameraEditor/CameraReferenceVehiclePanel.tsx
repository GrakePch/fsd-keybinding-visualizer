import { useMemo, useState } from "react";
import type { GroupVehicleBinding, ReferenceVehicle } from "../../utils/cameraVehicleBinding";
import { getCameraControlRanges } from "../../utils/cameraControlRanges";
import { getVehicleCameraIndex, resolveVehicleCamera } from "../../utils/thirdPersonCameraData";
import { isVehicleFallbackBoxModel } from "../../types/vehicleModel";
import styles from "./CameraModelSelectorPanel.module.css";

type Props = {
  vehicles: ReferenceVehicle[];
  selection: Extract<GroupVehicleBinding, { mode: "vehicle-context" }> | null;
  loading: boolean;
  errors: string[];
  onChange: (binding: Extract<GroupVehicleBinding, { mode: "vehicle-context" }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function CameraReferenceVehiclePanel({ vehicles, selection, loading, errors, onChange, onConfirm, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const filteredVehicles = useMemo(() => {
    const search = query.trim().toLowerCase().replace(/_/g, " ");
    return vehicles.filter((vehicle) => !search || `${vehicle.displayName} ${vehicle.vehicleId}`.toLowerCase().replace(/_/g, " ").includes(search));
  }, [vehicles, query]);
  const vehicle = vehicles.find((entry) => entry.vehicleId === selection?.vehicleId);
  const camera = resolveVehicleCamera(selection?.vehicleId || "", selection?.cameraId);
  const ranges = getCameraControlRanges({ cameraConfig: camera.cameraConfig, bounds: vehicle?.model?.bounds });

  return (
    <aside className={`${styles.panel} ${styles.referencePanel}`} aria-label="Reference vehicle selector">
      <div>
        <label className={styles.searchLabel}>
          <span>Reference vehicle</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle name or variant" />
        </label>
      </div>
      <div className={styles.statusRow} role="status">
        <span>{filteredVehicles.length} / {vehicles.length} vehicles{loading ? " · Loading model and size data…" : ""}</span>
        {errors.map((error) => <p key={error}>{error}</p>)}
        {getVehicleCameraIndex() === null && <p>Vehicle camera associations are unavailable. Ranges will be estimated or use defaults.</p>}
      </div>
      <div className={styles.modelList}>
        {filteredVehicles.map((entry) => (
          <button key={entry.vehicleId} type="button" aria-pressed={entry.vehicleId === selection?.vehicleId}
            className={`${styles.modelButton} ${entry.vehicleId === selection?.vehicleId ? `${styles.modelButtonActive} buttonHighlighted` : ""}`}
            onClick={() => onChange({ mode: "vehicle-context", vehicleId: entry.vehicleId })}>
            <span className={styles.modelName}>{entry.displayName}</span>
            <span className={styles.modelMeta}>{entry.vehicleId}</span>
            <span className={styles.modelMeta}>{getModelStatus(entry)} · {entry.cameraIds.length === 1 ? "Camera available" : entry.cameraIds.length > 1 ? `${entry.cameraIds.length} camera candidates` : "No camera config"}</span>
          </button>
        ))}
        {!filteredVehicles.length && <p>No matching vehicles.</p>}
      </div>
      {selection && (
        <div className={styles.referenceSummary} aria-label="Reference vehicle preview">
          <strong>{vehicle?.displayName || selection.vehicleId}</strong>
          <span>{vehicle ? getModelStatus(vehicle) : "No model available"}</span>
          {(camera.cameraIds.length > 1 || camera.needsSelection) && (
            <label className={styles.cameraChoice}>Camera configuration
              <select value={camera.cameraId || ""} onChange={(event) => onChange({ ...selection, cameraId: event.target.value || undefined })}>
                <option value="">Choose a camera configuration</option>
                {camera.cameraIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </label>
          )}
          {camera.needsSelection && <span role="status">Choose a configuration before applying this vehicle. Associations may include inferred candidates.</span>}
          {camera.cameraId && <span className={styles.cameraId}>{camera.cameraId}</span>}
          <span>Ranges: {ranges.source === "datacore" ? "Game data" : ranges.source === "inferred" ? "Estimated from vehicle size" : "Defaults"}</span>
          <span>Distance: {ranges.distance.recommended.min}–{ranges.distance.recommended.max}</span>
          <span>Target Offset: {(["x", "y", "z"] as const).map((axis) => `${axis.toUpperCase()} ${ranges.targetOffset[axis].recommended.min}…${ranges.targetOffset[axis].recommended.max}`).join(" · ")}</span>
          <span>Applies model and camera ranges to this group. Existing camera values stay unchanged.</span>
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="buttonAccent" onClick={onConfirm} disabled={!selection || camera.needsSelection}>Apply vehicle</button>
      </div>
    </aside>
  );
}

function getModelStatus(vehicle: ReferenceVehicle) {
  return isVehicleFallbackBoxModel(vehicle.model) ? "Dimensions fallback" : vehicle.model ? "3D model" : "No model available";
}
