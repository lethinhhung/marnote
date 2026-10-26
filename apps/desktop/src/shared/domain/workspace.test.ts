import { describe, expect, it } from "vitest";
import { isMarkdown, type Entry } from "./workspace";

const entry = (path: string, kind: Entry["kind"]): Entry => ({
  name: path.split("/").at(-1) ?? path,
  path,
  kind,
});

describe("isMarkdown", () => {
  it("accepts file entries with a case-insensitive .md extension", () => {
    expect(isMarkdown(entry("notes/readme.md", "file"))).toBe(true);
    expect(isMarkdown(entry("notes/README.MD", "file"))).toBe(true);
    expect(isMarkdown(entry("notes/Guide.Md", "file"))).toBe(true);
  });

  it("rejects files with other extensions", () => {
    expect(isMarkdown(entry("notes/readme.txt", "file"))).toBe(false);
    expect(isMarkdown(entry("notes/readme.markdown", "file"))).toBe(false);
  });

  it("rejects directory entries even when their path ends in .md", () => {
    expect(isMarkdown(entry("notes/archive.md", "directory"))).toBe(false);
  });
});
