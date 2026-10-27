import { beforeEach, describe, expect, it } from "vitest";
import { loadRecentWorkspaces, rememberRecentWorkspace } from "./recentWorkspaces";

const KEY = "marnote-workspaces";

function stored(): unknown {
  return JSON.parse(localStorage.getItem(KEY) || "null");
}

describe("loadRecentWorkspaces", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty list when nothing is stored", () => {
    expect(loadRecentWorkspaces()).toEqual([]);
  });

  it("returns stored string paths in order", () => {
    localStorage.setItem(KEY, JSON.stringify(["/a", "/b", "/c"]));
    expect(loadRecentWorkspaces()).toEqual(["/a", "/b", "/c"]);
  });

  it("returns an empty list for malformed JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadRecentWorkspaces()).toEqual([]);
  });

  it("returns an empty list when the stored value is not an array", () => {
    localStorage.setItem(KEY, JSON.stringify({ path: "/a" }));
    expect(loadRecentWorkspaces()).toEqual([]);
  });

  it("filters out non-string entries", () => {
    localStorage.setItem(KEY, JSON.stringify(["/a", 1, null, { path: "/b" }, "/c"]));
    expect(loadRecentWorkspaces()).toEqual(["/a", "/c"]);
  });
});

describe("rememberRecentWorkspace", () => {
  beforeEach(() => localStorage.clear());

  it("prepends the new path and persists it under the key", () => {
    const next = rememberRecentWorkspace(["/b", "/a"], "/c");
    expect(next).toEqual(["/c", "/b", "/a"]);
    expect(stored()).toEqual(["/c", "/b", "/a"]);
  });

  it("moves an existing path to the front without duplicating it", () => {
    const next = rememberRecentWorkspace(["/a", "/b", "/c"], "/b");
    expect(next).toEqual(["/b", "/a", "/c"]);
    expect(stored()).toEqual(["/b", "/a", "/c"]);
  });

  it("keeps at most five entries, dropping the oldest", () => {
    const next = rememberRecentWorkspace(["/e", "/d", "/c", "/b", "/a"], "/f");
    expect(next).toEqual(["/f", "/e", "/d", "/c", "/b"]);
    expect(next).toHaveLength(5);
    expect(stored()).toEqual(next);
  });

  it("uses only the first four stored items when adding", () => {
    const next = rememberRecentWorkspace(["/a", "/b", "/c", "/d", "/e", "/f"], "/g");
    expect(next).toHaveLength(5);
    expect(next).toEqual(["/g", "/a", "/b", "/c", "/d"]);
  });
});
