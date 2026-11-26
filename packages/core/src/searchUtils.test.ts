import { describe, expect, it } from "vitest";
import { makeExcerpt, normalize } from "./searchUtils.js";

describe("normalize", () => {
  it("lowercases text", () => {
    expect(normalize("Hello WORLD")).toBe("hello world");
  });
});

describe("makeExcerpt", () => {
  it("returns an empty string when no query word is found in the content", () => {
    expect(makeExcerpt("# Hello\n\nworld", "missing")).toBe("");
  });

  it("returns the trimmed source for an empty query", () => {
    expect(makeExcerpt("# Hello\n\nworld", "")).toBe("# Hello world");
  });

  it("truncates to 140 characters with a trailing ellipsis for an empty query", () => {
    const longContent = "A".repeat(200);
    const excerpt = makeExcerpt(longContent, "");
    expect(excerpt.length).toBe(141);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("omits the leading ellipsis when the match is at the start of the content", () => {
    const excerpt = makeExcerpt("target tail here", "target");
    expect(excerpt).toContain("target");
    expect(excerpt.startsWith("…")).toBe(false);
  });

  it("omits the trailing ellipsis when the match is at the end of the content", () => {
    const excerpt = makeExcerpt("head tail target", "target");
    expect(excerpt).toContain("target");
    expect(excerpt.endsWith("…")).toBe(false);
  });

  it("adds both leading and trailing ellipses when the match is in the middle of the content", () => {
    const content = "A".repeat(100) + " target " + "B".repeat(100);
    const excerpt = makeExcerpt(content, "target");
    expect(excerpt).toContain("target");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("includes context around all matches for a multi-word query", () => {
    const excerpt = makeExcerpt("before alpha middle beta after", "alpha beta");
    expect(excerpt).toContain("alpha");
    expect(excerpt).toContain("beta");
  });

  it("centers on the first found word when only some query words appear", () => {
    const excerpt = makeExcerpt("alpha beta gamma delta", "beta zeta");
    expect(excerpt).toContain("beta");
    expect(excerpt).not.toContain("zeta");
  });

  it("collapses internal whitespace and trims the excerpt", () => {
    const excerpt = makeExcerpt("  alpha   beta  \n gamma ", "beta");
    expect(excerpt).toBe("alpha beta gamma");
  });
});
