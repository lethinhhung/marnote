import { describe, expect, it } from "vitest";
import { isMarkdownFile } from "./workspace.js";

describe("isMarkdownFile", () => {
  it("returns true for .md files (case insensitive)", () => {
    expect(isMarkdownFile("note.md")).toBe(true);
    expect(isMarkdownFile("NOTE.MD")).toBe(true);
    expect(isMarkdownFile("Note.Md")).toBe(true);
    expect(isMarkdownFile("folder/note.md")).toBe(true);
  });

  it("returns false for non-markdown files", () => {
    expect(isMarkdownFile("note.txt")).toBe(false);
    expect(isMarkdownFile("script.rs")).toBe(false);
    expect(isMarkdownFile("data.json")).toBe(false);
    expect(isMarkdownFile("image.png")).toBe(false);
    expect(isMarkdownFile("folder")).toBe(false);
  });
});