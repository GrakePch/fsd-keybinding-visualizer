import "./ActionMapFileConsole.css";
import { ChangeEvent, useContext, useMemo, useRef, useState } from "react";
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
const LOCAL_PATH_UNSUPPORTED = "当前浏览器不支持本地路径读写，请使用 Chromium 系浏览器。";

const ActionMapFileConsole = () => {
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
    if (source === "localPath" && localPathLabel) return `读取路径：${localPathLabel}`;
    if (source === "upload" && loadedFileName) return `已加载文件：${loadedFileName}`;
    return "未加载 actionmap.xml";
  }, [loadedFileName, localPathLabel, source]);

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
      console.warn("读取上传文件失败。");
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
      console.warn(LOCAL_PATH_UNSUPPORTED);
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
        console.warn("未找到 actionmaps.xml；覆写游戏设置时将创建该文件。");
      }
    } catch {
      console.warn("读取本地路径失败或已取消。");
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
      console.warn("覆写游戏设置失败。");
    }
  };

  return (
    <section className="ActionMapFileConsole" aria-label="Action map file console">
      <input className="actionmap-file-input" ref={fileInputRef} type="file" accept=".xml" onChange={handleUploadFileSelect} />
      <p className="actionmap-file-source" title={loadedLabel}>
        {loadedLabel}
      </p>
      <div className="actionmap-file-controls">
        {mode === "idle" && (
          <>
            <button type="button" onClick={() => setMode("import")}>
              导入
            </button>
            <button type="button" onClick={() => setMode("export")}>
              导出
            </button>
          </>
        )}
        {mode === "import" && (
          <>
            <button type="button" onClick={() => setMode("idle")}>
              取消
            </button>
            <button type="button" onClick={openUploadPicker}>
              上传 xml
            </button>
            <button type="button" onClick={importFromLocalPath} disabled={!canUseLocalPath} title={canUseLocalPath ? "" : LOCAL_PATH_UNSUPPORTED}>
              读取本地路径
            </button>
          </>
        )}
        {mode === "export" && (
          <>
            <button type="button" onClick={() => setMode("idle")}>
              取消
            </button>
            <button type="button" onClick={downloadActionmapXml}>
              下载 xml
            </button>
            <button
              type="button"
              onClick={overwriteLocalPath}
              disabled={!canWriteLocalPath}
              title={canWriteLocalPath ? "" : source !== "localPath" ? "需要先通过读取本地路径导入。" : "没有发生修改，无需覆写。"}
            >
              覆写本地路径
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default ActionMapFileConsole;
