import { useState } from "react";
import type { CameraControlAxisRange } from "../../utils/cameraControlRanges";
import styles from "./CameraSliderNumberField.module.css";

interface CameraSliderNumberFieldProps {
  label: string;
  value: number;
  range: CameraControlAxisRange;
  step?: number;
  rangeNote?: string;
  onChange: (value: number) => void;
}

function CameraSliderNumberField({ label, value, range, step = 0.1, rangeNote, onChange }: CameraSliderNumberFieldProps) {
  const displayValue = formatSliderNumber(value);
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const updateInputValue = (nextValue: string) => {
    setDraftValue(nextValue);
    const parsedValue = Number(nextValue);
    if (Number.isFinite(parsedValue)) {
      onChange(parsedValue);
    }
  };

  const updateSliderValue = (nextValue: string) => {
    setDraftValue(null);
    const parsedValue = Number(nextValue);
    if (Number.isFinite(parsedValue)) {
      onChange(parsedValue);
    }
  };

  const commitDraft = () => {
    setDraftValue(null);
  };

  return (
    <label className={styles.field}>
      <span className={styles.labelRow}>
        <span>{label}</span>
        {rangeNote && <span className={styles.rangeNote}>{rangeNote}</span>}
      </span>
      <span className={styles.controlRow}>
        <input aria-label={label} type="range" min={range.slider.min} max={range.slider.max} step={step} value={value} onChange={(event) => updateSliderValue(event.target.value)} />
        <input
          aria-label={`${label} value`}
          className={styles.valueInput}
          type="number"
          min={range.input.min}
          max={range.input.max}
          step={step}
          value={draftValue ?? displayValue}
          onBlur={commitDraft}
          onChange={(event) => updateInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </span>
    </label>
  );
}

function formatSliderNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default CameraSliderNumberField;
