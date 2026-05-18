import "./ActionMapFileConsole.css";
import { ChangeEvent, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CTXGameRootDirectory, CTXUserActionmap } from "../../contexts";
import { ACTIONMAP_PATH_PARTS, WindowWithDirectoryPicker, getNestedFileHandle } from "../../utils/fileSystemAccess";
import { buildActionmapsXML, getUserActionmap } from "../../utils/utils";
import xmlToJson from "../../utils/xmlToJson";

type LoadedActionmapSource = "none" | "upload" | "localPath";

type ConsoleMode = "idle" | "import" | "export";

const ActionMapFileConsole = () => {
  const { t } = useTranslation("ui");
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const [gameRootDirectory, setGameRootDirectory] = useContext(CTXGameRootDirectory);
  const [mode, setMode] = useState<ConsoleMode>("idle");
  const [source, setSource] = useState<LoadedActionmapSource>("none");
  const [importedXmlString, setImportedXmlString] = useState("");
  const [baselineActionmapJson, setBaselineActionmapJson] = useState("{}");
  const [loadedFileName, setLoadedFileName] = useState("");

  const [isLocalActionmapMissing, setIsLocalActionmapMissing] = useState(false);
  const [isOverwriteSuccessVisible, setIsOverwriteSuccessVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overwriteSuccessTimerRef = useRef<number | null>(null);

  const canUseLocalPath = useMemo(() => typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function", []);
  const currentActionmapJson = useMemo(() => JSON.stringify(userActionmap), [userActionmap]);
  const hasActionmapChanges = currentActionmapJson !== baselineActionmapJson;
  const canWriteLocalPath = source === "localPath" && gameRootDirectory.rootDirectory !== null && hasActionmapChanges;

  const loadedLabel = useMemo(() => {
    if (source === "localPath" && isLocalActionmapMissing) return t("actionMapFileConsole.missingActionmapLabel");
    if (source === "localPath" && gameRootDirectory.pathLabel) return t("actionMapFileConsole.localPath", { path: gameRootDirectory.pathLabel });
    if (source === "upload" && loadedFileName) return t("actionMapFileConsole.loadedFile", { fileName: loadedFileName });
    return t("actionMapFileConsole.notLoaded");
  }, [gameRootDirectory.pathLabel, isLocalActionmapMissing, loadedFileName, source, t]);
  const consoleLabel = isOverwriteSuccessVisible ? t("actionMapFileConsole.overwriteSuccess") : mode === "import" ? t("actionMapFileConsole.importLocalPathHint") : loadedLabel;
  const isMissingActionmapLabelVisible = !isOverwriteSuccessVisible && mode !== "import" && source === "localPath" && isLocalActionmapMissing;

  useEffect(() => {
    return () => {
      if (overwriteSuccessTimerRef.current !== null) window.clearTimeout(overwriteSuccessTimerRef.current);
    };
  }, []);

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

  const showOverwriteSuccess = () => {
    if (overwriteSuccessTimerRef.current !== null) window.clearTimeout(overwriteSuccessTimerRef.current);
    setIsOverwriteSuccessVisible(true);
    overwriteSuccessTimerRef.current = window.setTimeout(() => {
      setIsOverwriteSuccessVisible(false);
      overwriteSuccessTimerRef.current = null;
    }, 3000);
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
      setIsLocalActionmapMissing(false);
      setMode("idle");
    } catch {
      console.warn(t("actionMapFileConsole.uploadFailedWarning"));
    }
  };

  const importFromLocalPath = async () => {
    if (!canUseLocalPath) {
      console.warn(t("actionMapFileConsole.localPathUnsupported"));
      return;
    }

    try {
      let rootDirectory = gameRootDirectory.rootDirectory;
      if (!rootDirectory) {
        rootDirectory = await (window as WindowWithDirectoryPicker).showDirectoryPicker?.({ mode: "readwrite" }) || null;
        if (!rootDirectory) return;
        setGameRootDirectory({ rootDirectory, pathLabel: rootDirectory.name });
      }

      setSource("localPath");
      setLoadedFileName("");
      setIsLocalActionmapMissing(false);
      setMode("idle");

      try {
        const actionmapHandle = await getNestedFileHandle(rootDirectory, ACTIONMAP_PATH_PARTS, false);
        const file = await actionmapHandle.getFile();
        loadActionmapXml(await file.text());
      } catch {
        setImportedXmlString("");
        setBaselineActionmapJson("{}");
        setUserActionmap({});
        setIsLocalActionmapMissing(true);
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
    if (!gameRootDirectory.rootDirectory) return;

    try {
      const actionmapHandle = await getNestedFileHandle(gameRootDirectory.rootDirectory, ACTIONMAP_PATH_PARTS, true);
      const writable = await actionmapHandle.createWritable();
      await writable.write(buildActionmapsXML(importedXmlString, userActionmap));
      await writable.close();
      setBaselineActionmapJson(currentActionmapJson);
      setMode("idle");
      showOverwriteSuccess();
    } catch {
      console.warn(t("actionMapFileConsole.overwriteFailedWarning"));
    }
  };

  return (
    <section className="ActionMapFileConsole" aria-label={t("actionMapFileConsole.ariaLabel")}>
      <input className="actionmap-file-input" ref={fileInputRef} type="file" accept=".xml" onChange={handleUploadFileSelect} />
      <p
        className={`actionmap-file-source${isOverwriteSuccessVisible ? " actionmap-file-source--success" : ""}${
          isMissingActionmapLabelVisible ? " actionmap-file-source--error" : ""
        }`}
        title={consoleLabel}
      >
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
              className="buttonAccent"
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
