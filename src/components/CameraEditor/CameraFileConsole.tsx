import Icon from "@mdi/react";
import { mdiContentSave, mdiFolderOpen, mdiRefresh, mdiTrayArrowDown, mdiTrayArrowUp } from "@mdi/js";
import Tooltip from "./Tooltip";
import type { SavedViewsDocument } from "../../types/savedViews";
import styles from "./CameraFileConsole.module.css";
import useCameraFileActions, { OPEN_PATH_TOOLTIP, UPLOAD_TOOLTIP, DOWNLOAD_TOOLTIP } from "./useCameraFileActions";
type LoadedSavedViewsSource = "none" | "upload" | "localPath";

interface CameraFileConsoleProps {
  savedViews: SavedViewsDocument | null;
  hasChanges: boolean;
  onLoad: (document: SavedViewsDocument, source: LoadedSavedViewsSource, loadedFileName: string) => void;
  onSaved: (document: SavedViewsDocument) => void;
}

function CameraFileConsole(props: CameraFileConsoleProps) {
  const { hasChanges } = props;
  const { fileInputRef, handleUploadFileSelect, readFromLocalPath, downloadXml, overwriteLocalPath, canUseLocalPath, canRefreshLocalPath, canOverwrite, canExport, isSaving, loadedLabel, statusMessage, isError: isLocalSavedViewsMissing } = useCameraFileActions(props);

  return (
    <section className={styles.console} aria-label="Camera file console">
      <input className={styles.fileInput} ref={fileInputRef} type="file" accept=".xml" onChange={handleUploadFileSelect} />
      <div className={styles.header}>
        <h2>Camera file</h2>
        {hasChanges && <span className={styles.dirtyPill}>Unsaved</span>}
      </div>
      <p className={`${styles.loadedLabel} ${isLocalSavedViewsMissing ? styles.errorLabel : ""}`} title={statusMessage || loadedLabel}>
        {statusMessage || loadedLabel}
      </p>
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <Tooltip className={styles.controlTooltip} tooltip={OPEN_PATH_TOOLTIP} position="bottom-left">
            <button className={styles.tooltipButton} type="button" onClick={() => readFromLocalPath(true)} disabled={!canUseLocalPath || isSaving}>
              <Icon className={styles.buttonIcon} path={mdiFolderOpen} size="1rem" aria-hidden="true" />
              Open Path
            </button>
          </Tooltip>
          <button type="button" onClick={() => readFromLocalPath()} disabled={!canRefreshLocalPath || isSaving}>
            <Icon className={styles.buttonIcon} path={mdiRefresh} size="1rem" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <button className={`${styles.fullWidthButton} buttonNormal`} type="button" onClick={overwriteLocalPath} disabled={!canOverwrite || !hasChanges || isSaving}>
          <Icon className={styles.buttonIcon} path={mdiContentSave} size="1rem" aria-hidden="true" />
          {isSaving ? "Saving…" : "Save to Path"}
        </button>
        <div className={styles.controlDivider} aria-hidden="true" />
        <div className={styles.controlRow}>
          <Tooltip className={styles.controlTooltip} tooltip={UPLOAD_TOOLTIP} position="bottom-left">
            <button className={styles.tooltipButton} type="button" disabled={isSaving} onClick={() => fileInputRef.current?.click()}>
              <Icon className={styles.buttonIcon} path={mdiTrayArrowUp} size="1rem" aria-hidden="true" />
              Upload
            </button>
          </Tooltip>
          <Tooltip className={styles.controlTooltip} tooltip={DOWNLOAD_TOOLTIP} position="bottom-left">
            <button className={styles.tooltipButton} type="button" onClick={downloadXml} disabled={!canExport}>
              <Icon className={styles.buttonIcon} path={mdiTrayArrowDown} size="1rem" aria-hidden="true" />
              Download
            </button>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}

export default CameraFileConsole;
