export type FileSystemWritableFileStreamLike = {
  write: (data: BlobPart) => Promise<void>;
  close: () => Promise<void>;
};

export type FileSystemFileHandleLike = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
};

export type FileSystemDirectoryHandleLike = {
  name: string;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandleLike>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandleLike>;
};

export type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandleLike>;
};

export interface GameRootDirectoryState {
  rootDirectory: FileSystemDirectoryHandleLike | null;
  pathLabel: string;
}

export const ACTIONMAP_PATH_PARTS = ["USER", "Client", "0", "Profiles", "default", "actionmaps.xml"];

export const SAVEDVIEWS_PATH_PARTS = ["USER", "Client", "0", "Profiles", "default", "savedviews.xml"];

export async function getNestedFileHandle(rootDirectory: FileSystemDirectoryHandleLike, pathParts: string[], create: boolean) {
  let directory = rootDirectory;

  for (const pathPart of pathParts.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(pathPart, { create });
  }

  return directory.getFileHandle(pathParts.at(-1)!, { create });
}
