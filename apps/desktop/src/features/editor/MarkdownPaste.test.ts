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

  it("detects and parses Markdown tables", () => {
    const parse = vi.fn(() => ({ content: [{ type: "table" }] }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("| a | b |\n|---|---|", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("| a | b |\n|---|---|");
    expect(insert).toHaveBeenCalledWith([{ type: "table" }]);
  });

  it("detects Markdown tables with alignment", () => {
    const parse = vi.fn(() => ({ content: [{ type: "table" }] }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("| a | b |\n| :--- | ---: |", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("| a | b |\n| :--- | ---: |");
    expect(insert).toHaveBeenCalledWith([{ type: "table" }]);
  });

  it("detects Markdown tables with multiple rows", () => {
    const parse = vi.fn(() => ({ content: [{ type: "table" }] }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("| a | b |\n|---|---|\n| c | d |", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("| a | b |\n|---|---|\n| c | d |");
    expect(insert).toHaveBeenCalledWith([{ type: "table" }]);
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

  it("inserts the original text when parsing produces empty array content", () => {
    const parse = vi.fn(() => ({ content: [] }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("- List item", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("- List item");
    expect(insert).toHaveBeenCalledWith("- List item");
  });

  it("inserts the original text when parsing produces null content", () => {
    const parse = vi.fn(() => ({ content: null }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("- List item", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("- List item");
    expect(insert).toHaveBeenCalledWith("- List item");
  });

  it("inserts the original text when parsing produces undefined content", () => {
    const parse = vi.fn(() => ({ content: undefined }));
    const insert = vi.fn();

    const handled = insertMarkdownPaste("- List item", parse, insert);

    expect(handled).toBe(true);
    expect(parse).toHaveBeenCalledWith("- List item");
    expect(insert).toHaveBeenCalledWith("- List item");
  });
});
