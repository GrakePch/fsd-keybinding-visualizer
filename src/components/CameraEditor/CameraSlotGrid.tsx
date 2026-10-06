import styles from "./CameraSlotGrid.module.css";

interface CameraSlotGridProps {
  occupiedSlotIds: readonly number[];
}

const SLOT_DISPLAY_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2];

function CameraSlotGrid({ occupiedSlotIds }: CameraSlotGridProps) {
  const occupiedSlots = SLOT_DISPLAY_ORDER.filter((slotId) => occupiedSlotIds.includes(slotId));
  const slotLabel = occupiedSlots.map((slotId) => slotId + 1).join(", ") || "none";

  return (
    <svg className={styles.grid} viewBox="0 0 16 16" role="img" aria-label={`Camera slots: ${slotLabel}`}>
      {SLOT_DISPLAY_ORDER.map((slotId, index) => (
        <rect
          className={`${styles.cell} ${occupiedSlotIds.includes(slotId) ? styles.cellFilled : ""}`}
          key={slotId}
          x={1 + (index % 3) * 5}
          y={1 + Math.floor(index / 3) * 5}
          width="4"
          height="4"
          aria-hidden="true"
        />
      ))}
      <path className={styles.lines} d="M5.5 .5V15.5M10.5 .5V15.5M.5 5.5H15.5M.5 10.5H15.5" aria-hidden="true" />
      <rect className={styles.lines} x=".5" y=".5" width="15" height="15" rx="2" aria-hidden="true" />
    </svg>
  );
}

export default CameraSlotGrid;
