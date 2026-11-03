import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import type { NodeViewProps } from "@tiptap/react";

const content = vi.hoisted(() => ({ code: "" }));

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  NodeViewContent: () => <code>{content.code}</code>,
}));

import { CodeBlockView } from "./CodeBlockView";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    codeBlock: { group: "block", content: "text*", marks: "", code: true, defining: true },
    text: {},
  },
  marks: {},
});

function createMockNodeViewProps(textContent: string) {
  const node = schema.node("codeBlock", null, [schema.text(textContent)]);
  const doc = schema.node("doc", null, [node]);
  const state = { doc } as unknown as { doc: typeof doc };
  const dispatch = vi.fn();
  const view = { state, dispatch };
  const editor = { view, state };
  return {
    node,
    decorations: [],
    innerDecorations: {
      forChild: () => [],
      forEachSet: () => undefined,
      map: () => [],
    },
    selected: false,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
    getPos: vi.fn(() => 0),
    view,
    editor,
    extension: {
      name: "codeBlock",
      options: {},
    } as unknown as { name: string; options: Record<string, unknown> },
    HTMLAttributes: {},
  } as unknown as NodeViewProps;
}

describe("CodeBlockView", () => {
  it("renders code content and copies it to the clipboard", async () => {
    const text = "const answer = 42;";
    content.code = text;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CodeBlockView {...createMockNodeViewProps(text)} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith(text);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
