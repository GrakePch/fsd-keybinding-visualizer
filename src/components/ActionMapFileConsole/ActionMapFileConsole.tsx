import "./ActionMapFileConsole.css";
import { ChangeEvent, useContext, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CTXUserActionmap } from "../../contexts";
import { buildActionmapsXML, getUserActionmap } from "../../utils/utils";
import xmlToJson from "../../utils/xmlToJson";

type LoadedActionmapSource = "none" | "upload" | "localPath";

type ConsoleMode = "idle" | "import" | "export";

type FileSystemWritableFileStreamLike = {
  write: (data: BlobPart) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandleLike = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
};

type FileSystemDirectoryHandleLike = {
  name: string;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandleLike>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandleLike>;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandleLike>;
};

const ACTIONMAP_PATH_PARTS = ["USER", "Client", "0", "Profiles", "default", "actionmaps.xml"];

const ActionMapFileConsole = () => {
  const { t } = useTranslation("ui");
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const [mode, setMode] = useState<ConsoleMode>("idle");
  const [source, setSource] = useState<LoadedActionmapSource>("none");
  const [importedXmlString, setImportedXmlString] = useState("");
  const [baselineActionmapJson, setBaselineActionmapJson] = useState("{}");
  const [loadedFileName, setLoadedFileName] = useState("");
  const [localRootDirectory, setLocalRootDirectory] = useState<FileSystemDirectoryHandleLike | null>(null);
  const [localPathLabel, setLocalPathLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseLocalPath = useMemo(() => typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function", []);
  const currentActionmapJson = useMemo(() => JSON.stringify(userActionmap), [userActionmap]);
  const hasActionmapChanges = currentActionmapJson !== baselineActionmapJson;
  const canWriteLocalPath = source === "localPath" && localRootDirectory !== null && hasActionmapChanges;

  const loadedLabel = useMemo(() => {
    if (source === "localPath" && localPathLabel) return t("actionMapFileConsole.localPath", { path: localPathLabel });
    if (source === "upload" && loadedFileName) return t("actionMapFileConsole.loadedFile", { fileName: loadedFileName });
    return t("actionMapFileConsole.notLoaded");
  }, [loadedFileName, localPathLabel, source, t]);
  const consoleLabel = mode === "import" ? t("actionMapFileConsole.importLocalPathHint") : loadedLabel;

  const loadActionmapXml = (xmlString: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const result = xmlToJson(xmlDoc);
    const parsedActionmap = getUserActionmap(result);

    setImportedXmlString(xmlString);
    setBaselineActionmapJson(JSON.stringify(parsedActionmap));
    setUserActionmap(parsedActionmap);
  };

  const openUploadPicker = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const xmlString = await file.text();
      loadActionmapXml(xmlString);
      setSource("upload");
      setLoadedFileName(file.name);
      setLocalRootDirectory(null);
      setLocalPathLabel("");
      setMode("idle");
    } catch {
      console.warn(t("actionMapFileConsole.uploadFailedWarning"));
    }
  };

  const getActionmapFileHandle = async (rootDirectory: FileSystemDirectoryHandleLike, create: boolean) => {
    let directory = rootDirectory;
    for (const pathPart of ACTIONMAP_PATH_PARTS.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(pathPart, { create });
    }

    return directory.getFileHandle(ACTIONMAP_PATH_PARTS.at(-1)!, { create });
  };

  const importFromLocalPath = async () => {
    if (!canUseLocalPath) {
      console.warn(t("actionMapFileConsole.localPathUnsupported"));
      return;
    }

    try {
      const rootDirectory = await (window as WindowWithDirectoryPicker).showDirectoryPicker?.({ mode: "readwrite" });
      if (!rootDirectory) return;

      setLocalRootDirectory(rootDirectory);
      setLocalPathLabel(rootDirectory.name);
      setSource("localPath");
      setLoadedFileName("");
      setMode("idle");

      try {
        const actionmapHandle = await getActionmapFileHandle(rootDirectory, false);
        const file = await actionmapHandle.getFile();
        loadActionmapXml(await file.text());
      } catch {
        setBaselineActionmapJson(currentActionmapJson);
        console.warn(t("actionMapFileConsole.missingActionmapWarning"));
      }
    } catch {
      console.warn(t("actionMapFileConsole.readLocalPathFailedWarning"));
    }
  };

  const downloadActionmapXml = () => {
    const xml = buildActionmapsXML(importedXmlString, userActionmap);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "actionmap.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMode("idle");
  };

  const overwriteLocalPath = async () => {
    if (!localRootDirectory) return;

    try {
      const actionmapHandle = await getActionmapFileHandle(localRootDirectory, true);
      const writable = await actionmapHandle.createWritable();
      await writable.write(buildActionmapsXML(importedXmlString, userActionmap));
      await writable.close();
      setBaselineActionmapJson(currentActionmapJson);
      setMode("idle");
    } catch {
      console.warn(t("actionMapFileConsole.overwriteFailedWarning"));
    }
  };

  return (
    <section className="ActionMapFileConsole" aria-label={t("actionMapFileConsole.ariaLabel")}>
      <input className="actionmap-file-input" ref={fileInputRef} type="file" accept=".xml" onChange={handleUploadFileSelect} />
      <p className="actionmap-file-source" title={consoleLabel}>
        {consoleLabel}
      </p>
      <div className="actionmap-file-controls">
        {mode === "idle" && (
          <>
            <button type="button" onClick={() => setMode("import")}>
              {t("actionMapFileConsole.import")}
            </button>
            <button type="button" onClick={() => setMode("export")}>
              {t("actionMapFileConsole.export")}
            </button>
          </>
        )}
        {mode === "import" && (
          <>
            <button type="button" onClick={() => setMode("idle")}>
              {t("actionMapFileConsole.cancel")}
            </button>
            <button type="button" onClick={openUploadPicker}>
              {t("actionMapFileConsole.uploadXml")}
            </button>
            <button type="button" onClick={importFromLocalPath} disabled={!canUseLocalPath} title={canUseLocalPath ? "" : t("actionMapFileConsole.localPathUnsupported")}>
              {t("actionMapFileConsole.readLocalPath")}
            </button>
          </>
        )}
        {mode === "export" && (
          <>
            <button type="button" onClick={() => setMode("idle")}>
              {t("actionMapFileConsole.cancel")}
            </button>
            <button type="button" onClick={downloadActionmapXml}>
              {t("actionMapFileConsole.downloadXml")}
            </button>
            <button
              type="button"
              onClick={overwriteLocalPath}
              disabled={!canWriteLocalPath}
              title={canWriteLocalPath ? "" : source !== "localPath" ? t("actionMapFileConsole.requiresLocalPathImport") : t("actionMapFileConsole.noChangesToOverwrite")}
            >
              {t("actionMapFileConsole.overwriteLocalPath")}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default ActionMapFileConsole;
