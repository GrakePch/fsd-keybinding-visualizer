import { ChangeEvent, useContext, useMemo, useRef, useState } from "react";
import { CTXGameRootDirectory } from "../../contexts";
import { SAVEDVIEWS_PATH_PARTS, WindowWithDirectoryPicker, getNestedFileHandle } from "../../utils/fileSystemAccess";
import { buildSavedViewsXml, parseSavedViewsXml } from "../../utils/savedViews";
import { SavedViewsDocument } from "../../types/savedViews";
import styles from "./CameraFileConsole.module.css";

type LoadedSavedViewsSource = "none" | "upload" | "localPath";

interface CameraFileConsoleProps {
  savedViews: SavedViewsDocument | null;
  hasChanges: boolean;
  onLoad: (document: SavedViewsDocument, source: LoadedSavedViewsSource, loadedFileName: string) => void;
  onSaved: () => void;
}

function CameraFileConsole({ savedViews, hasChanges, onLoad, onSaved }: CameraFileConsoleProps) {
  const [gameRootDirectory, setGameRootDirectory] = useContext(CTXGameRootDirectory);
  const [source, setSource] = useState<LoadedSavedViewsSource>("none");
  const [loadedFileName, setLoadedFileName] = useState("");
  const [isLocalSavedViewsMissing, setIsLocalSavedViewsMissing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseLocalPath = useMemo(() => typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function", []);
  const canExport = savedViews !== null;
  const canRefreshLocalPath = canUseLocalPath && gameRootDirectory.rootDirectory !== null;
  const canOverwrite = savedViews !== null && gameRootDirectory.rootDirectory !== null;

  const loadedLabel = useMemo(() => {
    if (statusMessage) return statusMessage;
    if (source === "localPath" && isLocalSavedViewsMissing) return "savedviews.xml was not found under this path";
    if (source === "localPath" && gameRootDirectory.pathLabel) return `Local path: ${gameRootDirectory.pathLabel}`;
    if (source === "upload" && loadedFileName) return `Loaded: ${loadedFileName}`;
    return "No savedviews.xml loaded";
  }, [gameRootDirectory.pathLabel, isLocalSavedViewsMissing, loadedFileName, source, statusMessage]);

  const loadXml = (xmlString: string, nextSource: LoadedSavedViewsSource, nextLoadedFileName = "") => {
    const parsed = parseSavedViewsXml(xmlString);
    setSource(nextSource);
    setLoadedFileName(nextLoadedFileName);
    setIsLocalSavedViewsMissing(false);
    setStatusMessage("");
    onLoad(parsed, nextSource, nextLoadedFileName);
  };

  const handleUploadFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      loadXml(await file.text(), "upload", file.name);
    } catch {
      setStatusMessage("Failed to load savedviews.xml");
    }
  };

  const chooseRootDirectory = async () => {
    if (!canUseLocalPath) return null;

    const rootDirectory = await (window as WindowWithDirectoryPicker).showDirectoryPicker?.({ mode: "readwrite" });
    if (!rootDirectory) return null;

    setGameRootDirectory({ rootDirectory, pathLabel: rootDirectory.name });
    return rootDirectory;
  };

  const readFromLocalPath = async (forceChoosePath = false) => {
    if (!canUseLocalPath) {
      setStatusMessage("Local path access is not supported in this browser");
      return;
    }

    try {
      const rootDirectory = forceChoosePath || !gameRootDirectory.rootDirectory ? await chooseRootDirectory() : gameRootDirectory.rootDirectory;
      if (!rootDirectory) return;

      setSource("localPath");
      setLoadedFileName("");
      setStatusMessage("");

      try {
        const savedViewsHandle = await getNestedFileHandle(rootDirectory, SAVEDVIEWS_PATH_PARTS, false);
        const file = await savedViewsHandle.getFile();
        loadXml(await file.text(), "localPath");
      } catch {
        setIsLocalSavedViewsMissing(true);
        setStatusMessage("");
      }
    } catch {
      setStatusMessage("Failed to read local path");
    }
  };

  const downloadXml = () => {
    if (!savedViews) return;

    const blob = new Blob([buildSavedViewsXml(savedViews)], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "savedviews.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const overwriteLocalPath = async () => {
    if (!savedViews || !gameRootDirectory.rootDirectory) return;

    try {
      const savedViewsHandle = await getNestedFileHandle(gameRootDirectory.rootDirectory, SAVEDVIEWS_PATH_PARTS, true);
      const writable = await savedViewsHandle.createWritable();
      await writable.write(buildSavedViewsXml(savedViews));
      await writable.close();
      setSource("localPath");
      setIsLocalSavedViewsMissing(false);
      setStatusMessage("savedviews.xml overwritten");
      onSaved();
    } catch {
      setStatusMessage("Failed to overwrite savedviews.xml");
    }
  };

  return (
    <section className={styles.console} aria-label="Camera file console">
      <input className={styles.fileInput} ref={fileInputRef} type="file" accept=".xml" onChange={handleUploadFileSelect} />
      <div className={styles.header}>
        <h2>Camera file</h2>
        {hasChanges && <span className={styles.dirtyPill}>Unsaved</span>}
      </div>
      <p className={`${styles.loadedLabel} ${isLocalSavedViewsMissing ? styles.errorLabel : ""}`} title={loadedLabel}>
        {loadedLabel}
      </p>
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button type="button" onClick={() => readFromLocalPath(true)} disabled={!canUseLocalPath}>
            Open Path
          </button>
          <button type="button" onClick={() => readFromLocalPath()} disabled={!canRefreshLocalPath}>
            Refresh
          </button>
        </div>
        <button className={`${styles.fullWidthButton} buttonNormal`} type="button" onClick={overwriteLocalPath} disabled={!canOverwrite || !hasChanges}>
          Save to path
        </button>
        <div className={styles.controlDivider} aria-hidden="true" />
        <div className={styles.controlRow}>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload
          </button>
          <button type="button" onClick={downloadXml} disabled={!canExport}>
            Download
          </button>
        </div>
      </div>
    </section>
  );
}

export default CameraFileConsole;
