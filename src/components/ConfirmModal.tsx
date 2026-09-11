import type { ReactNode } from "react";
import { useEffect } from "react";
import Icon from "@mdi/react";
import { mdiCancel, mdiCheck } from "@mdi/js";
import styles from "./ConfirmModal.module.css";

export type ConfirmModalTone = "accent" | "danger" | "normal";

interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmTone?: ConfirmModalTone;
  confirmIconPath?: string;
  cancelIconPath?: string;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmModal({ title, description, confirmLabel, cancelLabel = "Cancel", confirmTone = "accent", confirmIconPath = mdiCheck, cancelIconPath = mdiCancel, onConfirm, onClose }: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h2 id="confirm-modal-title">{title}</h2>
        <div className={styles.description}>{description}</div>
        <div className={styles.actions}>
          <button className={styles.actionButton} type="button" onClick={onClose}>
            <Icon path={cancelIconPath} size="1rem" aria-hidden="true" />
            {cancelLabel}
          </button>
          <button className={`${styles.actionButton} ${styles[`confirmButton${capitalize(confirmTone)}`]}`} type="button" onClick={onConfirm}>
            <Icon path={confirmIconPath} size="1rem" aria-hidden="true" />
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function capitalize(value: ConfirmModalTone) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default ConfirmModal;
