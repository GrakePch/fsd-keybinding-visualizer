import type { ReactNode, RefObject } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
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
  confirmDisabled?: boolean;
  size?: "normal" | "large";
  contentClassName?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  additionalActions?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmModal({ title, description, confirmLabel, cancelLabel = "Cancel", confirmTone = "accent", confirmIconPath = mdiCheck, cancelIconPath = mdiCancel, confirmDisabled = false, size = "normal", contentClassName, initialFocusRef, additionalActions, onConfirm, onClose }: ConfirmModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdropRef.current);
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    document.body.style.overflow = "hidden";
    (initialFocusRef?.current || cancelRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])") || [])
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) { event.preventDefault(); modalRef.current?.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [initialFocusRef]);

  const modal = (
    <div ref={backdropRef} className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={modalRef} className={styles.modal} data-size={size} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        <div className={`${styles.description} ${contentClassName || ""}`}>{description}</div>
        <div className={styles.actions}>
          {additionalActions && <div className={styles.additionalActions}>{additionalActions}</div>}
          <button ref={cancelRef} className={styles.actionButton} type="button" onClick={onClose}>
            <Icon path={cancelIconPath} size="1rem" aria-hidden="true" />
            {cancelLabel}
          </button>
          <button className={`${styles.actionButton} ${styles[`confirmButton${capitalize(confirmTone)}`]}`} type="button" onClick={onConfirm} disabled={confirmDisabled}>
            <Icon path={confirmIconPath} size="1rem" aria-hidden="true" />
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

function capitalize(value: ConfirmModalTone) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default ConfirmModal;
