import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@mdi/react";
import { mdiClose, mdiHistory, mdiRedo, mdiUndo } from "@mdi/js";
import { CAMERA_HISTORY_LIMIT, getCameraHistorySnapshot, type CameraHistoryState } from "../../utils/cameraHistory";
import styles from "./CameraHistoryControls.module.css";

interface Props {
  history: CameraHistoryState;
  dirtyGroupIds: ReadonlySet<string>;
  onTravel: (cursor: number) => void;
}

export default function CameraHistoryControls({ history, dirtyGroupIds, onTravel }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const canUndo = history.cursor > 0;
  const canRedo = history.cursor < history.entries.length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      // Keep native text editing shortcuts and other dialogs independent of document history.
      if (target instanceof HTMLElement && (target.closest("input:not([type='range']), textarea, select, [contenteditable]:not([contenteditable='false'])") || (target.closest("[role='dialog']") && !target.closest("[data-camera-history]")))) return;
      if (document.querySelector("[role='dialog']:not([data-camera-history])")) return;
      const key = event.key.toLowerCase();
      const undo = key === "z" && !event.shiftKey;
      const redo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
      if (!undo && !redo) return;
      event.preventDefault();
      if (undo && canUndo) onTravel(history.cursor - 1);
      if (redo && canRedo) onTravel(history.cursor + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRedo, canUndo, history.cursor, onTravel]);

  return (
    <section className={styles.controls} aria-label="Camera edit history">
      <div className={styles.toolbar}>
        <button type="button" disabled={!canUndo} onClick={() => onTravel(history.cursor - 1)} title={canUndo ? `Undo: ${history.entries[history.cursor - 1].label} (Ctrl/Cmd+Z)` : "Undo (Ctrl/Cmd+Z)"}>
          <Icon path={mdiUndo} size="1rem" aria-hidden="true" />Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={() => onTravel(history.cursor + 1)} title={canRedo ? `Redo: ${history.entries[history.cursor].label} (Ctrl/Cmd+Shift+Z or Ctrl+Y)` : "Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)"}>
          <Icon path={mdiRedo} size="1rem" aria-hidden="true" />Redo
        </button>
        <button type="button" aria-label="History" title="Edit history" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
          <Icon path={mdiHistory} size="1rem" aria-hidden="true" />
        </button>
      </div>
      <p className={styles.summary} aria-live="polite">{dirtyGroupIds.size ? `${dirtyGroupIds.size} unsaved group${dirtyGroupIds.size === 1 ? "" : "s"}` : "No unsaved group changes"}</p>
      {isOpen && createPortal(<CameraHistoryModal history={history} dirtyGroupIds={dirtyGroupIds} onTravel={onTravel} onClose={close} />, document.body)}
    </section>
  );
}

export function CameraHistoryModal({ history, dirtyGroupIds, onTravel, onClose }: Props & { onClose: () => void }) {
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentDocument = getCameraHistorySnapshot(history).document;
  const presentIds = new Set(currentDocument?.groups.map((group) => group.id));

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const buttons = modalRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="camera-history-title" aria-describedby="camera-history-description" data-camera-history>
        <div className={styles.header}>
          <div><h2 id="camera-history-title">Edit history</h2><p id="camera-history-description">Select a state to undo or redo to that point.</p></div>
          <button ref={closeRef} type="button" aria-label="Close history" onClick={onClose}><Icon path={mdiClose} size="1.2rem" aria-hidden="true" /></button>
        </div>
        <div className={styles.status} aria-live="polite">{history.cursor} applied · {history.entries.length - history.cursor} to redo</div>
        <ol className={styles.list} aria-label="Operation stack">
          {history.entries.map((entry, index) => (
            <li key={index}>
              <button type="button" className={`${styles.entry} ${index + 1 === history.cursor ? styles.current : ""} ${index >= history.cursor ? styles.future : ""}`} aria-current={index + 1 === history.cursor ? "step" : undefined} onClick={() => onTravel(index + 1)}>
                <span className={styles.entryHeading}><span>{index + 1}. {entry.label}</span><span className={styles.badge}>{index + 1 === history.cursor ? "Current" : index >= history.cursor ? "To redo" : "Applied"}</span></span>
                <span className={styles.detail}>{entry.groupIds.join(" · ")}</span>
              </button>
            </li>
          )).reverse()}
          <li>
            <button type="button" className={`${styles.entry} ${history.cursor === 0 ? styles.current : ""}`} aria-current={history.cursor === 0 ? "step" : undefined} onClick={() => onTravel(0)}>
              <span className={styles.entryHeading}>Starting state{history.cursor === 0 && <span className={styles.badge}>Current</span>}</span>
              <span className={styles.detail}>Before the oldest retained operation</span>
            </button>
          </li>
        </ol>
        <details className={styles.unsaved}>
          <summary>Unsaved groups ({dirtyGroupIds.size})</summary>
          {dirtyGroupIds.size === 0 ? <p>No unsaved group changes.</p> : <ul>{[...dirtyGroupIds].sort().map((id) => <li key={id}>{id}{!presentIds.has(id) && <span className={styles.badge}>Deleted</span>}</li>)}</ul>}
        </details>
        <p className={styles.note}>Last {CAMERA_HISTORY_LIMIT} operations in this session. Loading a file starts a new history. Saving keeps history; downloading exports a copy. Reference vehicle changes affect the preview only.</p>
        <div className={styles.footer}>
          <button type="button" disabled={history.cursor === 0} onClick={() => onTravel(history.cursor - 1)}><Icon path={mdiUndo} size="1rem" aria-hidden="true" />Undo</button>
          <button type="button" disabled={history.cursor === history.entries.length} onClick={() => onTravel(history.cursor + 1)}><Icon path={mdiRedo} size="1rem" aria-hidden="true" />Redo</button>
        </div>
      </section>
    </div>
  );
}
