import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraGroupDrawer from "./CameraGroupDrawer";

describe("CameraGroupDrawer", () => {
  it("renders group names with spaces while preserving the original id as the button title", () => {
    const markup = renderToStaticMarkup(
      <CameraGroupDrawer
        groups={[{ id: "AEGS_Avenger_Titan_View", slots: [], rawAttributes: {} }]}
        selectedGroupId="AEGS_Avenger_Titan_View"
        onSelectGroup={() => {}}
      />,
    );

    expect(markup).toContain("AEGS Avenger Titan View");
    expect(markup).toContain("title=\"AEGS_Avenger_Titan_View\"");
  });
});