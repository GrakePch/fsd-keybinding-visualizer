import { mdiAlert, mdiAlertCircle, mdiCheckCircle, mdiInformation } from "@mdi/js";
import TooltipIcon from "./TooltipIcon";

interface CameraRangeNoteIconProps {
  note: string;
}

function getCameraRangeNoteIconPath(note: string) {
  const isOutsideRange = note.includes("Current value is outside the range.");

  if (note.startsWith("This range is tested in game.") && isOutsideRange) {
    return mdiAlert;
  }

  if (isOutsideRange) {
    return mdiAlertCircle;
  }

  if (note === "This range is tested in game.") {
    return mdiCheckCircle;
  }

  return mdiInformation;
}

function isCameraRangeNoteWarning(note: string) {
  return note.includes("Current value is outside the range.");
}

function isCameraRangeNoteDanger(note: string) {
  return note.startsWith("This range is tested in game.") && note.includes("Current value is outside the range.");
}

function CameraRangeNoteIcon({ note }: CameraRangeNoteIconProps) {
  const variant = isCameraRangeNoteDanger(note) ? "danger" : isCameraRangeNoteWarning(note) ? "warning" : "default";

  return <TooltipIcon tooltip={note} iconPath={getCameraRangeNoteIconPath(note)} variant={variant} />;
}

export { getCameraRangeNoteIconPath, isCameraRangeNoteDanger, isCameraRangeNoteWarning };
export default CameraRangeNoteIcon;
