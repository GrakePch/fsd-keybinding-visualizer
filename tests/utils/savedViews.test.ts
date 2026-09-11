import { describe, expect, it } from "vitest";
import { addSavedViewGroup } from "../../src/utils/savedViews";

describe("saved view groups", () => {
  it("adds an empty group without duplicating an existing id", () => {
    const document = {
      groups: [{ id: "Existing", slots: [], rawAttributes: {} }],
      originalXmlString: "<SavedViews />",
    };

    const added = addSavedViewGroup(document, "New group");
    expect(added.groups).toHaveLength(2);
    expect(added.groups[1]).toEqual({ id: "New group", slots: [], rawAttributes: { ID: "New group" } });
    expect(addSavedViewGroup(added, "Existing")).toBe(added);
  });
});
