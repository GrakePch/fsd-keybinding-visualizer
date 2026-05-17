import { CAMERA_LENS_VERTICAL_FOV_DEGREES, MAX_CAMERA_LENS_SIZE, MIN_CAMERA_LENS_SIZE, getCameraLensVerticalFov, normalizeCameraLensSize } from "../../utils/cameraFrustum";
import styles from "./CameraLensZoomField.module.css";

interface CameraLensZoomFieldProps {
  value: number;
  onChange: (value: number) => void;
}

function CameraLensZoomField({ value, onChange }: CameraLensZoomFieldProps) {
  const normalizedValue = normalizeCameraLensSize(value);
  const verticalFov = getCameraLensVerticalFov(normalizedValue);

  return (
    <label className={styles.field}>
      <span className={styles.labelRow}>
        <span>Lens Zoom</span>
        <span className={styles.fovValue}>FOV Y {verticalFov}°</span>
      </span>
      <div className={styles.control}>
        <input aria-label="Lens Zoom" type="range" min={MIN_CAMERA_LENS_SIZE} max={MAX_CAMERA_LENS_SIZE} step={1} value={normalizedValue} list="camera-lens-zoom-steps" onChange={(event) => onChange(normalizeCameraLensSize(Number(event.target.value)))} />
        <datalist id="camera-lens-zoom-steps">
          {CAMERA_LENS_VERTICAL_FOV_DEGREES.map((_, index) => (
            <option key={index} value={index} />
          ))}
        </datalist>
      </div>
    </label>
  );
}

export default CameraLensZoomField;
