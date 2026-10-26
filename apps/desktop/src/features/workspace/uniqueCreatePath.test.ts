import { describe, expect, it } from "vitest";
import { uniqueCreatePath } from "./uniqueCreatePath";
import type { Entry } from "./workspaceTypes";

const file = (path: string): Entry => ({
  name: path.split("/").pop() ?? path,
  path,
  kind: "file",
});

describe("uniqueCreatePath", () => {
  it("keeps an unchanged path when there is no sibling conflict", () => {
    expect(uniqueCreatePath([file("notes/existing.md")], "notes/new.md")).toBe("notes/new.md");
  });

  it("matches sibling conflicts without regard to case", () => {
    expect(uniqueCreatePath([file("notes/REPORT.md")], "notes/report.md")).toBe("notes/report-1.md");
  });

  it("uses the first available numeric suffix", () => {
    const entries = [file("notes/plan.md"), file("notes/plan-1.md"), file("notes/plan-2.md")];
    expect(uniqueCreatePath(entries, "notes/plan.md")).toBe("notes/plan-3.md");
  });

  it("preserves the .md extension when adding a suffix", () => {
    expect(uniqueCreatePath([file("notes/draft.md")], "notes/draft.md")).toBe("notes/draft-1.md");
  });

  it("handles root-level paths", () => {
    expect(uniqueCreatePath([file("README.md")], "README.md")).toBe("README-1.md");
  });

  it("checks conflicts among entries in the same nested folder", () => {
    const entries = [file("projects/alpha/brief.md"), file("projects/beta/brief.md")];
    expect(uniqueCreatePath(entries, "projects/alpha/brief.md")).toBe("projects/alpha/brief-1.md");
  });
});
