import { describe, expect, it } from "vitest";
import { dropDestination } from "./treeDrop";

describe("dropDestination", () => {
  it("uses a folder target as the destination folder", () => {
    expect(dropDestination("notes/draft.md", "archive", "directory"))
      .toBe("archive/draft.md");
  });

  it("uses a file target's parent as the destination folder", () => {
    expect(dropDestination("notes/draft.md", "archive/readme.md", "file"))
      .toBe("archive/draft.md");
  });

  it("resolves a root-level file target to a root destination", () => {
    expect(dropDestination("notes/draft.md", "readme.md", "file"))
      .toBe("draft.md");
  });

  it("preserves the source item's name when moving it", () => {
    expect(dropDestination("projects/2026/plan.md", "archive", "directory"))
      .toBe("archive/plan.md");
  });

  it("rejects empty targets and drops onto the same item", () => {
    expect(dropDestination("notes/draft.md", "", "directory")).toBeNull();
    expect(dropDestination("notes/draft.md", "notes/draft.md", "file")).toBeNull();
  });

  it("rejects dropping a folder onto itself or one of its descendants", () => {
    expect(dropDestination("projects", "projects", "directory")).toBeNull();
    expect(dropDestination("projects", "projects/archive", "directory")).toBeNull();
  });
});
