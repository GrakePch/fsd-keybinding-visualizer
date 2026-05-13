import styles from "./CameraNumberField.module.css";

interface CameraNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function CameraNumberField({ label, value, onChange }: CameraNumberFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default CameraNumberField;
