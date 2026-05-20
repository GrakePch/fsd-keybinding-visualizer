import type { CSSProperties } from "react";
import { useState } from "react";
import { Vec3 } from "../../types/savedViews";
import type { CameraControlAxisRange } from "../../utils/cameraControlRanges";
import { CAMERA_GIZMO_AXIS_COLORS } from "../../utils/cameraGizmo";
import CameraRangeNoteIcon from "./CameraRangeNoteIcon";
import styles from "./CameraVector3Editor.module.css";

interface CameraVector3EditorProps {
  label: string;
  value: Vec3;
  fields?: CameraVector3EditorField[];
  variant?: "number" | "angleSlider" | "rangeSlider";
  ranges?: Partial<Record<keyof Vec3, CameraControlAxisRange>>;
  rangeNotes?: Partial<Record<keyof Vec3, string>>;
  onChange: (value: Vec3) => void;
}

export type CameraVector3EditorField = {
  axis: keyof Vec3;
  label: string;
};

const DEFAULT_FIELDS: CameraVector3EditorField[] = [
  { axis: "x", label: "X" },
  { axis: "y", label: "Y" },
  { axis: "z", label: "Z" },
];

const MIN_ANGLE_DEGREES = -180;
const MAX_ANGLE_DEGREES = 180;
const MIN_PITCH_DEGREES = -85;
const MAX_PITCH_DEGREES = 70;
const ANGLE_STEP_DEGREES = 0.1;
const RANGE_SLIDER_STEP = 0.1;

const AXIS_COLOR_BY_KEY: Record<keyof Vec3, (typeof CAMERA_GIZMO_AXIS_COLORS)[number]> = {
  x: CAMERA_GIZMO_AXIS_COLORS[0],
  y: CAMERA_GIZMO_AXIS_COLORS[1],
  z: CAMERA_GIZMO_AXIS_COLORS[2],
};

type AxisSliderStyle = CSSProperties & {
  "--camera-axis-color": string;
};

function getAxisSliderStyle(axis: keyof Vec3): AxisSliderStyle {
  return { "--camera-axis-color": AXIS_COLOR_BY_KEY[axis] };
}

function formatSliderNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function getAngleRange(axis: keyof Vec3) {
  return axis === "x" ? { min: MIN_PITCH_DEGREES, max: MAX_PITCH_DEGREES } : { min: MIN_ANGLE_DEGREES, max: MAX_ANGLE_DEGREES };
}

function clampAngle(value: number, axis: keyof Vec3) {
  const { min, max } = getAngleRange(axis);
  return Math.min(max, Math.max(min, value));
}

function formatAngle(value: number, axis: keyof Vec3) {
  return clampAngle(value, axis).toFixed(1);
}

function parseAngle(value: string, axis: keyof Vec3) {
  return Number(formatAngle(Number(value), axis));
}

function CameraVector3Editor({ label, value, fields = DEFAULT_FIELDS, variant = "number", ranges = {}, rangeNotes = {}, onChange }: CameraVector3EditorProps) {
  const isAngleSlider = variant === "angleSlider";
  const isRangeSlider = variant === "rangeSlider";
  const [angleDrafts, setAngleDrafts] = useState<Partial<Record<keyof Vec3, string>>>({});
  const [rangeDrafts, setRangeDrafts] = useState<Partial<Record<keyof Vec3, string>>>({});

  const updateAxis = (axis: keyof Vec3, nextValue: string) => {
    const parsedValue = Number(nextValue);
    if (!Number.isFinite(parsedValue)) return;
    onChange({ ...value, [axis]: isAngleSlider ? parseAngle(nextValue, axis) : parsedValue });
  };

  const updateAngleDraft = (axis: keyof Vec3, nextValue: string) => {
    setAngleDrafts((drafts) => ({ ...drafts, [axis]: nextValue }));
    const parsedValue = Number(nextValue);
    if (Number.isFinite(parsedValue)) {
      onChange({ ...value, [axis]: clampAngle(parsedValue, axis) });
    }
  };

  const updateRangeDraft = (axis: keyof Vec3, nextValue: string) => {
    setRangeDrafts((drafts) => ({ ...drafts, [axis]: nextValue }));
    const parsedValue = Number(nextValue);
    if (Number.isFinite(parsedValue)) {
      onChange({ ...value, [axis]: parsedValue });
    }
  };

  const clearRangeDraft = (axis: keyof Vec3) => {
    setRangeDrafts((drafts) => {
      const remainingDrafts = { ...drafts };
      delete remainingDrafts[axis];
      return remainingDrafts;
    });
  };

  const updateRangeSlider = (axis: keyof Vec3, nextValue: string) => {
    clearRangeDraft(axis);
    updateAxis(axis, nextValue);
  };

  const commitAngleDraft = (axis: keyof Vec3) => {
    const draft = angleDrafts[axis];
    setAngleDrafts((drafts) => {
      const remainingDrafts = { ...drafts };
      delete remainingDrafts[axis];
      return remainingDrafts;
    });
    if (draft === undefined || draft.trim() === "") return;
    updateAxis(axis, draft);
  };

  return (
    <fieldset className={`${styles.fieldset} ${isAngleSlider || isRangeSlider ? styles.angleSliderFieldset : ""}`}>
      <legend>{label}</legend>
      {fields.map((field) => {
        const angleValue = formatAngle(value[field.axis], field.axis);
        const angleRange = getAngleRange(field.axis);
        const angleInputValue = angleDrafts[field.axis] ?? angleValue;
        const range = ranges[field.axis];
        const rangeNote = rangeNotes[field.axis];
        const sliderValue = formatSliderNumber(value[field.axis]);
        const rangeInputValue = rangeDrafts[field.axis] ?? sliderValue;
        const axisSliderStyle = getAxisSliderStyle(field.axis);

        return (
          <label className={`${styles.axisField} ${isAngleSlider || isRangeSlider ? styles.angleSliderField : ""} ${isRangeSlider ? styles.rangeSliderField : ""}`} key={field.axis} style={axisSliderStyle}>
            {isAngleSlider ? (
              <>
                <span className={styles.labelRow}>
                  <span>{field.label}</span>
                </span>
                <span className={styles.controlRow}>
                  <input
                    aria-label={field.label}
                    type="range"
                    min={angleRange.min}
                    max={angleRange.max}
                    step={ANGLE_STEP_DEGREES}
                    value={angleValue}
                    onChange={(event) => updateAxis(field.axis, event.target.value)}
                  />
                  <input
                    className={styles.angleValue}
                    aria-label={`${field.label} angle`}
                    type="number"
                    min={angleRange.min}
                    max={angleRange.max}
                    step={ANGLE_STEP_DEGREES}
                    value={angleInputValue}
                    onBlur={() => commitAngleDraft(field.axis)}
                    onChange={(event) => updateAngleDraft(field.axis, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </span>
              </>
            ) : isRangeSlider && range ? (
              <>
                <span className={styles.labelRow}>
                  <span>{field.label}</span>
                  {rangeNote && <CameraRangeNoteIcon note={rangeNote} />}
                </span>
                <span className={styles.controlRow}>
                  <input
                    aria-label={field.label}
                    type="range"
                    min={range.slider.min}
                    max={range.slider.max}
                    step={RANGE_SLIDER_STEP}
                    value={value[field.axis]}
                    onChange={(event) => updateRangeSlider(field.axis, event.target.value)}
                  />
                  <input
                    className={styles.angleValue}
                    aria-label={`${field.label} value`}
                    type="number"
                    min={range.input.min}
                    max={range.input.max}
                    step={RANGE_SLIDER_STEP}
                    value={rangeInputValue}
                    onBlur={() => clearRangeDraft(field.axis)}
                    onChange={(event) => updateRangeDraft(field.axis, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </span>
              </>
            ) : (
              <>
                <span>{field.label}</span>
                <input type="number" value={value[field.axis]} onChange={(event) => updateAxis(field.axis, event.target.value)} />
              </>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

export default CameraVector3Editor;
