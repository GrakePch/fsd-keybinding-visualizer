import { describe, expect, it } from "vitest";
import { getDraftModelForGroup, setDraftModelForGroup } from "./cameraGroupModelDrafts";

const aurora = { slug: "aurora", displayName: "Aurora", glb: "aurora.glb", src: "/vehicle-models/aurora.glb" };
const titan = { slug: "titan", displayName: "Titan", glb: "titan.glb", src: "/vehicle-models/titan.glb" };

describe("camera group model drafts", () => {
  it("stores the selected model for the active group without affecting other groups", () => {
    const drafts = setDraftModelForGroup({}, "group-a", aurora);

    expect(getDraftModelForGroup(drafts, "group-a")).toBe(aurora);
    expect(getDraftModelForGroup(drafts, "group-b")).toBeNull();
  });

  it("restores the latest model selected for each group", () => {
    const drafts = setDraftModelForGroup(
      setDraftModelForGroup({}, "group-a", aurora),
      "group-b",
      titan,
    );

    expect(getDraftModelForGroup(drafts, "group-a")?.slug).toBe("aurora");
    expect(getDraftModelForGroup(drafts, "group-b")?.slug).toBe("titan");
  });

  it("ignores empty group ids", () => {
    const drafts = setDraftModelForGroup({}, "", aurora);

    expect(drafts).toEqual({});
    expect(getDraftModelForGroup(drafts, "")).toBeNull();
  });
});
