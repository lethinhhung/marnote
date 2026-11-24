import { describe, expect, it } from "vitest";
import { emojiForShortcode, matchingEmojiShortcodes } from "./emojiShortcodes";

describe("emoji shortcodes", () => {
  it("converts known names without case sensitivity", () => {
    expect(emojiForShortcode("SMILE")).toBe("😄");
    expect(emojiForShortcode("unknown")).toBeUndefined();
  });

  it("returns up to eight names containing the query", () => {
    expect(matchingEmojiShortcodes("HEA")).toEqual(["heart"]);
    expect(matchingEmojiShortcodes("")).toHaveLength(8);
    expect(matchingEmojiShortcodes("missing")).toEqual([]);
  });
});
