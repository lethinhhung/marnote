import { describe, expect, it } from "vitest";
import { initialMarkdown } from "./initialMarkdown";

describe("initialMarkdown", () => {
  it("provides representative Markdown examples in the welcome note", () => {
    expect(initialMarkdown).toContain("## Welcome to your note");
    expect(initialMarkdown).toContain("**Markdown editor**");
    expect(initialMarkdown).toContain("[link](https://example.com)");
    expect(initialMarkdown).toContain("> Good notes make room for unfinished thoughts.");
    expect(initialMarkdown).toContain("```text");
    expect(initialMarkdown).toContain("- [ ] Capture an idea");
  });
});
