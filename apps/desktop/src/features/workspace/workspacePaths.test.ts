import { describe, expect, it } from "vitest";
import { isSameOrDescendant, rebasePath } from "./workspacePaths";

describe("rebasePath", () => {
  it("rebases an exact path when a workspace item is renamed or moved", () => {
    expect(rebasePath("notes/today.md", "notes/today.md", "archive/today.md"))
      .toBe("archive/today.md");
  });

  it("rebases descendants while preserving their suffix", () => {
    expect(rebasePath("notes/project/today.md", "notes", "archive"))
      .toBe("archive/project/today.md");
  });

  it("leaves unrelated paths unchanged", () => {
    expect(rebasePath("other/today.md", "notes", "archive")).toBe("other/today.md");
  });

  it("does not rebase similarly prefixed siblings", () => {
    expect(rebasePath("notes-old/today.md", "notes", "archive"))
      .toBe("notes-old/today.md");
  });
});

describe("isSameOrDescendant", () => {
  it("matches the exact removed path and its descendants", () => {
    expect(isSameOrDescendant("notes", "notes")).toBe(true);
    expect(isSameOrDescendant("notes/today.md", "notes")).toBe(true);
  });

  it("does not match unrelated paths or similarly prefixed siblings", () => {
    expect(isSameOrDescendant("other/today.md", "notes")).toBe(false);
    expect(isSameOrDescendant("notes-old/today.md", "notes")).toBe(false);
  });
});
