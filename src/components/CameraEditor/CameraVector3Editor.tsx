import { Vec3 } from "../../types/savedViews";
import styles from "./CameraVector3Editor.module.css";

interface CameraVector3EditorProps {
  label: string;
  value: Vec3;
  onChange: (value: Vec3) => void;
}

function CameraVector3Editor({ label, value, onChange }: CameraVector3EditorProps) {
  const updateAxis = (axis: keyof Vec3, nextValue: string) => {
    onChange({ ...value, [axis]: Number(nextValue) });
  };

  return (
    <fieldset className={styles.fieldset}>
      <legend>{label}</legend>
      {(["x", "y", "z"] as Array<keyof Vec3>).map((axis) => (
        <label className={styles.axisField} key={axis}>
          <span>{axis.toUpperCase()}</span>
          <input type="number" value={value[axis]} onChange={(event) => updateAxis(axis, event.target.value)} />
        </label>
      ))}
    </fieldset>
  );
}

export default CameraVector3Editor;
