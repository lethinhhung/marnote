import { describe, expect, it } from "vitest";
import { updateEntryEmptiness, updateSavedEntry } from "./workspaceMutations";
import type { Entry } from "./workspace";

const entries: Entry[] = [
  { name: "note.md", path: "notes/note.md", kind: "file", metadata: { createdMs: 100, updatedMs: 100 } },
  { name: "other.md", path: "notes/other.md", kind: "file", metadata: { createdMs: 200, updatedMs: 200 } },
];

describe("updateSavedEntry", () => {
  it("updates modifiedMs and updatedMs while preserving createdMs", () => {
    const result = updateSavedEntry(entries, "notes/note.md", false, 9000);
    const updated = result.find((entry) => entry.path === "notes/note.md");

    expect(updated?.isEmpty).toBe(false);
    expect(updated?.modifiedMs).toBe(9000);
    expect(updated?.metadata?.updatedMs).toBe(9000);
    expect(updated?.metadata?.createdMs).toBe(100);
  });

  it("sets createdMs to updatedMs when no created timestamp exists", () => {
    const result = updateSavedEntry([{ name: "note.md", path: "note.md", kind: "file" }], "note.md", false, 5000);
    expect(result[0]?.metadata?.createdMs).toBe(5000);
    expect(result[0]?.metadata?.updatedMs).toBe(5000);
  });

  it("leaves other entries unchanged and does not mutate the input", () => {
    const result = updateSavedEntry(entries, "notes/note.md", false, 9000);
    expect(result[1]?.metadata?.updatedMs).toBe(200);
    expect(entries[0]?.metadata?.updatedMs).toBe(100);
    expect(entries[0]?.isEmpty).toBeUndefined();
  });
});

describe("updateEntryEmptiness", () => {
  it("updates only the matching entry without mutating the input", () => {
    const source: Entry[] = [
      { name: "note.md", path: "notes/note.md", kind: "file", isEmpty: false },
      { name: "other.md", path: "notes/other.md", kind: "file", isEmpty: false },
    ];
    const result = updateEntryEmptiness(source, "notes/note.md", true);

    expect(result[0]?.isEmpty).toBe(true);
    expect(result[1]?.isEmpty).toBe(false);
    expect(source[0]?.isEmpty).toBe(false);
  });
});
