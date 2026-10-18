import { describe, expect, it } from "vitest";
import { isExternalConflict } from "./workspaceConflict";

describe("isExternalConflict", () => {
  it("does not prompt when external content is unchanged", () => {
    expect(isExternalConflict("saved", "saved", "draft")).toBe(false);
  });

  it("flags external changes so the caller can offer load-external", () => {
    expect(isExternalConflict("external edit", "saved", "saved")).toBe(true);
  });

  it("does not replace a locally edited draft with external content", () => {
    expect(isExternalConflict("external edit", "saved", "local edit")).toBe(true);
  });

  it("does not flag content that already matches the local draft", () => {
    expect(isExternalConflict("local edit", "saved", "local edit")).toBe(false);
  });
});
