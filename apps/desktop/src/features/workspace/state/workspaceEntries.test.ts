import { describe, expect, it } from "vitest";
import { updateEntryEmptiness, updateSavedEntry } from "./workspaceEntries";
import type { Entry } from "../workspaceTypes";

const file = (path: string, overrides: Partial<Entry> = {}): Entry => ({
  name: path.split("/").at(-1) ?? path,
  path,
  kind: "file",
  ...overrides,
});

describe("updateSavedEntry", () => {
  it("marks a note empty and records created and updated timestamps", () => {
    const entries = [file("notes/a.md", { isEmpty: false })];
    const updated = updateSavedEntry(entries, "notes/a.md", true, 1000);

    expect(updated[0]?.isEmpty).toBe(true);
    expect(updated[0]?.metadata?.createdMs).toBe(1000);
    expect(updated[0]?.metadata?.updatedMs).toBe(1000);
  });

  it("preserves an existing created timestamp while updating the modified timestamp", () => {
    const entries = [file("notes/a.md", { metadata: { createdMs: 100, updatedMs: 100 } })];
    const updated = updateSavedEntry(entries, "notes/a.md", false, 2000);

    expect(updated[0]?.metadata?.createdMs).toBe(100);
    expect(updated[0]?.metadata?.updatedMs).toBe(2000);
  });

  it("updates a nested entry located by its full path", () => {
    const entries = [file("notes/folder/a.md", { isEmpty: false })];
    const updated = updateSavedEntry(entries, "notes/folder/a.md", true, 500);

    expect(updated[0]?.isEmpty).toBe(true);
    expect(updated[0]?.metadata?.updatedMs).toBe(500);
  });

  it("returns entries unchanged when the path is not found", () => {
    const entries = [file("notes/a.md")];
    const updated = updateSavedEntry(entries, "notes/missing.md", true, 1000);

    expect(updated).toEqual(entries);
  });

  it("does not mutate the original entries", () => {
    const entries = [file("notes/a.md", { isEmpty: false })];
    updateSavedEntry(entries, "notes/a.md", true, 1000);

    expect(entries[0]?.isEmpty).toBe(false);
    expect(entries[0]?.metadata).toBeUndefined();
  });
});

describe("updateEntryEmptiness", () => {
  it("sets isEmpty on the matching entry", () => {
    const entries = [file("notes/a.md", { isEmpty: false })];
    const updated = updateEntryEmptiness(entries, "notes/a.md", true);

    expect(updated[0]?.isEmpty).toBe(true);
  });

  it("clears isEmpty when set to false", () => {
    const entries = [file("notes/a.md", { isEmpty: true })];
    const updated = updateEntryEmptiness(entries, "notes/a.md", false);

    expect(updated[0]?.isEmpty).toBe(false);
  });

  it("updates a nested entry's emptiness", () => {
    const entries = [file("notes/folder/a.md", { isEmpty: false })];
    const updated = updateEntryEmptiness(entries, "notes/folder/a.md", true);

    expect(updated[0]?.isEmpty).toBe(true);
  });

  it("does nothing when the path is not found", () => {
    const entries = [file("notes/a.md", { isEmpty: false })];
    const updated = updateEntryEmptiness(entries, "notes/missing.md", true);

    expect(updated[0]?.isEmpty).toBe(false);
  });

  it("does not mutate the original entries", () => {
    const entries = [file("notes/a.md", { isEmpty: false })];
    updateEntryEmptiness(entries, "notes/a.md", true);

    expect(entries[0]?.isEmpty).toBe(false);
  });
});
