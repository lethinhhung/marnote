import { describe, expect, it, vi } from "vitest";
import type { Entry } from "../../../shared/domain/workspace";
import { navigateHref } from "./useSlashLink";

const entries: Entry[] = [
  { name: "Note.md", path: "Note.md", kind: "file" },
  { name: "Folder", path: "Folder", kind: "directory" },
  { name: "SubNote.md", path: "Folder/SubNote.md", kind: "file" },
];

describe("useSlashLink.navigateHref", () => {
  it("resolves relative workspace link to root note entry", () => {
    const onNavigate = vi.fn();
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "Note.md" });
    expect(onNavigate).toHaveBeenCalledWith("Note.md", "file");
  });

  it("resolves relative workspace link to folder entry", () => {
    const onNavigate = vi.fn();
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "Folder" });
    expect(onNavigate).toHaveBeenCalledWith("Folder", "directory");
  });

  it("resolves relative workspace link to nested note entry", () => {
    const onNavigate = vi.fn();
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "Folder/SubNote.md" });
    expect(onNavigate).toHaveBeenCalledWith("Folder/SubNote.md", "file");
  });

  it("resolves absolute workspace link starting with slash", () => {
    const onNavigate = vi.fn();
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "/Note.md" });
    expect(onNavigate).toHaveBeenCalledWith("Note.md", "file");
  });

  it("falls back to external link for unknown workspace href", () => {
    const onNavigate = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "https://example.com" });
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    expect(onNavigate).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("falls back to external link for mailto scheme", () => {
    const onNavigate = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "mailto:test@example.com" });
    expect(openSpy).toHaveBeenCalledWith("mailto:test@example.com", "_blank", "noopener,noreferrer");
    expect(onNavigate).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("falls back to external link for unrecognized relative path", () => {
    const onNavigate = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    navigateHref({ entries, path: "notes/current.md", onNavigate, value: "unknown.md" });
    expect(openSpy).toHaveBeenCalledWith("https://unknown.md", "_blank", "noopener,noreferrer");
    expect(onNavigate).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});