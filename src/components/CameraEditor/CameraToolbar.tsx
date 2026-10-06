import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@mdi/react";
import { mdiArrowULeftTop, mdiArrowURightTop } from "@mdi/js";
import type { SavedViewsDocument } from "../../types/savedViews";
import type { CameraHistoryState } from "../../utils/cameraHistory";
import { CAMERA_FRUSTUM_ASPECT_RATIOS, type CameraFrustumAspectRatioId } from "../../utils/cameraFrustum";
import Menu from "../Menu";
import Tooltip from "./Tooltip";
import { CameraHistoryModal } from "./CameraHistoryControls";
import useCameraHistoryCommands from "./useCameraHistoryCommands";
import useCameraFileActions, { OPEN_PATH_TOOLTIP, UPLOAD_TOOLTIP, DOWNLOAD_TOOLTIP } from "./useCameraFileActions";
import { dockToRight, dockToLeft, leftPanelClose, rightPanelClose } from "../../icons/interfaceIcon";
import styles from "./CameraToolbar.module.css";

interface Props {
  savedViews: SavedViewsDocument | null;
  history: CameraHistoryState;
  dirtyGroupIds: ReadonlySet<string>;
  onLoad: (document: SavedViewsDocument) => void;
  onSaved: (document: SavedViewsDocument) => void;
  onTravel: (cursor: number) => void;
  groupsPanelOpen: boolean;
  controlPanelOpen: boolean;
  onToggleGroupsPanel: () => void;
  onToggleControlPanel: () => void;
  aspectRatioId: CameraFrustumAspectRatioId;
  onSelectAspectRatio: (id: CameraFrustumAspectRatioId) => void;
}

export default function CameraToolbar({ savedViews, history, dirtyGroupIds, onLoad, onSaved, onTravel, groupsPanelOpen, controlPanelOpen, onToggleGroupsPanel, onToggleControlPanel, aspectRatioId, onSelectAspectRatio }: Props) {
  const files = useCameraFileActions({ savedViews, hasChanges: dirtyGroupIds.size > 0, onLoad, onSaved });
  const commands = useCameraHistoryCommands(history, onTravel);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuState = (label: string) => ({
    open: activeMenu === label,
    onOpenChange: (open: boolean) => setActiveMenu(current => open ? label : current === label ? null : current),
    onTriggerHover: () => setActiveMenu(current => current === null ? null : label),
  });
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const feedback = [files.statusMessage, dirtyGroupIds.size ? `${dirtyGroupIds.size} unsaved group${dirtyGroupIds.size === 1 ? "" : "s"}` : savedViews ? "No unsaved changes" : ""].filter(Boolean).join(" · ");
  const status = [files.loadedLabel, feedback].filter(Boolean).join(" · ");
  const groupsToggleLabel = `${groupsPanelOpen ? "Collapse" : "Expand"} groups panel`;
  const controlToggleLabel = `${controlPanelOpen ? "Collapse" : "Expand"} camera control panel`;

  return <header className={styles.toolbar} aria-label="Camera toolbar">
    <input hidden ref={files.fileInputRef} type="file" accept=".xml" aria-label="Upload savedviews XML" onChange={files.handleUploadFileSelect} />
    <Tooltip tooltip={groupsToggleLabel} position="bottom-left">
      <button className={styles.iconButton} type="button" aria-label={groupsToggleLabel} aria-expanded={groupsPanelOpen} aria-controls="camera-groups-panel" onClick={onToggleGroupsPanel}>
        <Icon path={groupsPanelOpen ? leftPanelClose : dockToRight} size="18px" color="#e3e3e3" aria-hidden="true" />
      </button>
    </Tooltip>
    <Tooltip tooltip={commands.undoTooltip} position="bottom-left">
      <button className={styles.iconButton} type="button" aria-label="Undo" disabled={!commands.canUndo} onClick={commands.undo}><Icon path={mdiArrowULeftTop} size="18px" color="#e3e3e3" aria-hidden="true" /></button>
    </Tooltip>
    <Tooltip tooltip={commands.redoTooltip} position="bottom-left">
      <button className={styles.iconButton} type="button" aria-label="Redo" disabled={!commands.canRedo} onClick={commands.redo}><Icon path={mdiArrowURightTop} size="18px" color="#e3e3e3" aria-hidden="true" /></button>
    </Tooltip>
    <Menu label="Import" {...menuState("Import")} className={styles.textButton} items={[
      { id: "open", label: "Open Game Path", tooltip: OPEN_PATH_TOOLTIP, disabled: !files.canUseLocalPath || files.isSaving, onSelect: () => { void files.readFromLocalPath(true); } },
      { id: "refresh", label: "Refresh", disabled: !files.canRefreshLocalPath || files.isSaving, onSelect: () => { void files.readFromLocalPath(); } },
      { id: "upload", label: "Upload XML", tooltip: UPLOAD_TOOLTIP, disabled: files.isSaving, onSelect: () => files.fileInputRef.current?.click() },
    ]} />
    <Menu label="Export" {...menuState("Export")} className={styles.textButton} items={[
      { id: "save", label: files.isSaving ? "Saving…" : "Save to Game Path", disabled: !files.canOverwrite, onSelect: () => { void files.overwriteLocalPath(); } },
      { id: "download", label: "Download XML", tooltip: DOWNLOAD_TOOLTIP, disabled: !files.canExport, onSelect: files.downloadXml },
    ]} />
    <Menu label="History" {...menuState("History")} className={styles.textButton} items={[
      { id: "undo", label: "Undo", disabled: !commands.canUndo, tooltip: commands.undoTooltip, shortcut: "Ctrl/Cmd+Z", onSelect: commands.undo },
      { id: "redo", label: "Redo", disabled: !commands.canRedo, tooltip: commands.redoTooltip, shortcut: "Ctrl/Cmd+Shift+Z", onSelect: commands.redo },
      { id: "history", label: "History", onSelect: () => setHistoryOpen(true) },
    ]} />
    <Menu label="View" {...menuState("View")} className={styles.textButton} items={CAMERA_FRUSTUM_ASPECT_RATIOS.map(option => ({ id: option.id, label: option.label, checked: aspectRatioId === option.id, onSelect: () => onSelectAspectRatio(option.id) }))} />
    <span className={styles.divider} aria-hidden="true" />
    <p className={styles.status} role="status" aria-live="polite" aria-atomic="true" title={status}>
      <span>{files.loadedLabel}</span>{feedback && <span className={files.isError ? styles.error : dirtyGroupIds.size ? styles.unsaved : undefined}> · {feedback}</span>}
    </p>
    <Tooltip tooltip={controlToggleLabel} position="bottom-right" className={styles.rightToggle}>
      <button className={styles.iconButton} type="button" aria-label={controlToggleLabel} aria-expanded={controlPanelOpen} aria-controls="camera-control-panel" onClick={onToggleControlPanel}>
        <Icon path={controlPanelOpen ? rightPanelClose : dockToLeft} size="18px" color="#e3e3e3" aria-hidden="true" />
      </button>
    </Tooltip>
    {historyOpen && createPortal(<CameraHistoryModal history={history} dirtyGroupIds={dirtyGroupIds} onTravel={onTravel} onClose={closeHistory} />, document.body)}
  </header>;
}
