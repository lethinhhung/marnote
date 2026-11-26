import { describe, expect, it } from "vitest";
import { emojiForShortcode, matchingEmojiShortcodes } from "./emojiShortcodes";

describe("emoji shortcodes", () => {
  it("converts known names without case sensitivity", () => {
    expect(emojiForShortcode("SMILE")).toBe("😄");
    expect(emojiForShortcode("unknown")).toBeUndefined();
  });

  it("returns every matching picker name", () => {
    expect(matchingEmojiShortcodes("HEA")).toContain("heart");
    expect(matchingEmojiShortcodes("grinning_face")).toContain("grinning_face");
    expect(matchingEmojiShortcodes("")).toHaveLength(8);
    expect(matchingEmojiShortcodes("missing")).toEqual([]);
  });
});
