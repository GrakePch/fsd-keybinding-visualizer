import Icon from "@mdi/react";
import { SavedViewGroup } from "../../types/savedViews";
import actionIcon from "../../icons/actionIcon";
import { getSlotById } from "../../utils/savedViews";
import styles from "./CameraSlotButtons.module.css";

interface CameraSlotButtonsProps {
  selectedGroup?: SavedViewGroup;
  selectedSlotId: number;
  onSelectSlot: (slotId: number) => void;
}

const SLOT_DISPLAY_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2];

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

function CameraSlotButtons({ selectedGroup, selectedSlotId, onSelectSlot }: CameraSlotButtonsProps) {
  return (
    <div className={styles.slots} aria-label="Camera slots">
      {SLOT_DISPLAY_ORDER.map((slotId) => {
        const hasSlot = selectedGroup ? Boolean(getSlotById(selectedGroup, slotId)) : false;

        return (
          <button
            className={cx(styles.slotButton, !hasSlot && styles.slotButtonMissing, selectedSlotId === slotId && styles.slotButtonActive, selectedSlotId === slotId && "buttonAccent")}
            key={slotId}
            type="button"
            aria-label={`Camera slot ${slotId + 1}`}
            onClick={() => onSelectSlot(slotId)}
          >
            <Icon path={actionIcon("view_director_mode", `view_load_view_${slotId + 1}`)} size="2rem" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default CameraSlotButtons;
