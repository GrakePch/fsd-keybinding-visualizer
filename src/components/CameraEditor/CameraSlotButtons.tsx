import { SavedViewGroup } from "../../types/savedViews";
import { getSlotById } from "../../utils/savedViews";
import styles from "./CameraSlotButtons.module.css";

interface CameraSlotButtonsProps {
  selectedGroup?: SavedViewGroup;
  selectedSlotId: number;
  onSelectSlot: (slotId: number) => void;
}

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

function CameraSlotButtons({ selectedGroup, selectedSlotId, onSelectSlot }: CameraSlotButtonsProps) {
  return (
    <div className={styles.slots} aria-label="Camera slots">
      {Array.from({ length: 9 }, (_, slotId) => {
        const hasSlot = selectedGroup ? Boolean(getSlotById(selectedGroup, slotId)) : false;

        return (
          <button
            className={cx(styles.slotButton, !hasSlot && styles.slotButtonMissing, selectedSlotId === slotId && styles.slotButtonActive)}
            key={slotId}
            type="button"
            onClick={() => onSelectSlot(slotId)}
          >
            {slotId + 1}
          </button>
        );
      })}
    </div>
  );
}

export default CameraSlotButtons;
