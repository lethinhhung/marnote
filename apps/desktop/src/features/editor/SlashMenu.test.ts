import { describe, expect, it } from "vitest";
import { matchingSlashIds } from "./SlashMenu";

describe("matchingSlashIds", () => {
  it("matches substrings within labels", () => {
    expect(matchingSlashIds("heading")).toEqual(["heading1", "heading2", "heading3"]);
    expect(matchingSlashIds("quote")).toEqual(["quote"]);
  });

  it("matches substrings within details", () => {
    expect(matchingSlashIds("unordered")).toEqual(["bullet"]);
    expect(matchingSlashIds("markdown")).toEqual(["table"]);
    expect(matchingSlashIds("fixed-width")).toEqual(["code"]);
  });

  it("matches case-insensitively across label and detail", () => {
    expect(matchingSlashIds("HEADING")).toEqual(["heading1", "heading2", "heading3"]);
    expect(matchingSlashIds("To-Do")).toEqual(["task"]);
    expect(matchingSlashIds("CHECKBOXES")).toEqual(["task"]);
  });

  it("preserves the declared choices order", () => {
    expect(matchingSlashIds("list")).toEqual(["bullet", "number", "task"]);
  });

  it("returns no ids for an unmatched query", () => {
    expect(matchingSlashIds("nonexistent")).toEqual([]);
    expect(matchingSlashIds("")).toHaveLength(12);
  });
});
