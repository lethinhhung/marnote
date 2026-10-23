import { describe, expect, it, vi } from "vitest";
import { insertMarkdownPaste } from "./MarkdownPaste";

describe("insertMarkdownPaste", () => {
  it("parses and inserts recognized Markdown", () => {
    const parse = vi.fn(() => ({ content: [{ type: "heading" }] }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("# Heading", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("# Heading");
    expect(insert).toHaveBeenCalledWith([{ type: "heading" }]);
  });

  it("does not parse or insert unrecognized input", () => {
    const parse = vi.fn(() => ({ content: "parsed" }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("Just plain text", parse, insert);

    expect(handled).toBe(false);
    expect(parse).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the original text when parsing produces no content", () => {
    const parse = vi.fn(() => undefined);
    const insert = vi.fn();

    const handled = insertMarkdownPaste("- List item", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("- List item");
    expect(insert).toHaveBeenCalledWith("- List item");
  });
});
