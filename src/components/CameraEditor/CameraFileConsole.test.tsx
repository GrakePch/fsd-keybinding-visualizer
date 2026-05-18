import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import CameraFileConsole from "./CameraFileConsole";

describe("CameraFileConsole", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders camera file controls in path, save, and upload/download groups", () => {
    vi.stubGlobal("window", { showDirectoryPicker: undefined });

    const markup = renderToStaticMarkup(
      <CameraFileConsole
        savedViews={null}
        hasChanges={false}
        onLoad={() => {}}
        onSaved={() => {}}
      />,
    );

    expect(markup).toMatch(/Open Path[\s\S]*Refresh[\s\S]*Save to Path[\s\S]*Upload[\s\S]*Download/);
    expect(markup).not.toContain("Read Path");
    expect(markup).not.toContain("Change Path");
    expect(markup).not.toContain("Overwrite");
  });
});
