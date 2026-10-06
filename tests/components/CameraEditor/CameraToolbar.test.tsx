import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import CameraToolbar from "../../../src/components/CameraEditor/CameraToolbar";
import { createCameraHistory } from "../../../src/utils/cameraHistory";

describe("CameraToolbar", () => {
  afterEach(() => vi.unstubAllGlobals());
  const base = { onLoad: () => {}, onSaved: () => {}, onTravel: () => {}, onToggleGroupsPanel: () => {}, onToggleControlPanel: () => {}, aspectRatioId: "16:9" as const, onSelectAspectRatio: () => {} };

  it("keeps unavailable history actions disabled and retains explanatory tooltips", () => {
    vi.stubGlobal("window", {});
    const markup = renderToStaticMarkup(<CameraToolbar {...base} savedViews={null} history={createCameraHistory()} dirtyGroupIds={new Set()} groupsPanelOpen controlPanelOpen />);
    expect(markup).toMatch(/aria-label="Undo" disabled=""/);
    expect(markup).toMatch(/aria-label="Redo" disabled=""/);
    expect(markup).toContain('data-tooltip="Undo (Ctrl/Cmd+Z)"');
    expect(markup).toContain('aria-controls="camera-groups-panel"');
    expect(markup).toContain('aria-label="Collapse groups panel" aria-expanded="true"');
    expect(markup).toContain('aria-label="Collapse camera control panel" aria-expanded="true"');
    expect(markup).not.toContain('role="radio"');
  });

  it("keeps unsaved deletions visible even while both panels are collapsed", () => {
    vi.stubGlobal("window", {});
    const document = { groups: [], originalXmlString: "<SavedViews />" };
    const markup = renderToStaticMarkup(<CameraToolbar {...base} savedViews={document} history={createCameraHistory(document)} dirtyGroupIds={new Set(["Deleted group"])} groupsPanelOpen={false} controlPanelOpen={false} />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('1 unsaved group');
    expect(markup).toContain('aria-label="Expand groups panel" aria-expanded="false"');
    expect(markup).toContain('aria-label="Expand camera control panel" aria-expanded="false"');
    expect(markup).not.toContain('No unsaved changes');
  });
});
