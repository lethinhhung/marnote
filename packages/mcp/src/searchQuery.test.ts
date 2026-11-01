import { describe, expect, it } from "vitest";
import { hasWords, normalize, parseQuery } from "./searchQuery";

describe("normalize", () => {
  it("lowercases text", () => {
    expect(normalize("Hello World")).toBe("hello world");
    expect(normalize("PROJECT ALPHA")).toBe("project alpha");
  });

  it("leaves already lowercase text unchanged", () => {
    expect(normalize("hello world")).toBe("hello world");
  });

  it("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });
});

describe("parseQuery", () => {
  it("splits a multi-word query into normalized words", () => {
    expect(parseQuery("project alpha")).toEqual(["project", "alpha"]);
  });

  it("collapses extra whitespace and trims edges", () => {
    expect(parseQuery("  project   alpha  ")).toEqual(["project", "alpha"]);
    expect(parseQuery("\tproject\nalpha\t")).toEqual(["project", "alpha"]);
  });

  it("returns a single word for a single-term query", () => {
    expect(parseQuery("alpha")).toEqual(["alpha"]);
  });

  it("returns an empty array for empty or whitespace-only queries", () => {
    expect(parseQuery("")).toEqual([]);
    expect(parseQuery("   ")).toEqual([]);
    expect(parseQuery("\t\n")).toEqual([]);
  });

  it("normalizes each word to lowercase", () => {
    expect(parseQuery("ProJect ALPHA")).toEqual(["project", "alpha"]);
  });
});

describe("hasWords", () => {
  it("returns true when value contains every word", () => {
    expect(hasWords("project alpha timeline", ["project", "alpha"])).toBe(true);
    expect(hasWords("project alpha timeline", ["timeline"])).toBe(true);
  });

  it("returns false when any word is missing", () => {
    expect(hasWords("project alpha", ["project", "beta"])).toBe(false);
    expect(hasWords("project", ["project", "alpha"])).toBe(false);
  });

  it("returns true for an empty word list", () => {
    expect(hasWords("anything", [])).toBe(true);
  });

  it("is case-sensitive because the value is expected pre-normalized", () => {
    expect(hasWords("PROJECT", ["project"])).toBe(false);
    expect(hasWords("project", ["PROJECT"])).toBe(false);
  });
});
