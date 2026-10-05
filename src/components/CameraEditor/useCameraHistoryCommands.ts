import { useEffect } from "react";
import type { CameraHistoryState } from "../../utils/cameraHistory";

export default function useCameraHistoryCommands(history: CameraHistoryState, onTravel: (cursor: number) => void) {
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

  return {
    canUndo, canRedo,
    undo: () => { if (canUndo) onTravel(history.cursor - 1); },
    redo: () => { if (canRedo) onTravel(history.cursor + 1); },
    undoTooltip: canUndo ? `Undo: ${history.entries[history.cursor - 1].label} (Ctrl/Cmd+Z)` : "Undo (Ctrl/Cmd+Z)",
    redoTooltip: canRedo ? `Redo: ${history.entries[history.cursor].label} (Ctrl/Cmd+Shift+Z or Ctrl+Y)` : "Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)",
  };
}
