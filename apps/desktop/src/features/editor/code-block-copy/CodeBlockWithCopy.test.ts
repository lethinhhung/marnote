import { describe, expect, it, vi } from "vitest";
import type { CodeBlockOptions } from "@tiptap/extension-code-block";

const { renderNodeView } = vi.hoisted(() => ({
  renderNodeView: vi.fn(() => "node-view-renderer"),
}));

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: renderNodeView,
}));

vi.mock("./CodeBlockView", () => ({
  CodeBlockView: "code-block-view",
}));

import { CodeBlockWithCopy } from "./CodeBlockWithCopy";

describe("CodeBlockWithCopy", () => {
  it("configures addNodeView to use ReactNodeViewRenderer with CodeBlockView", () => {
    expect(typeof CodeBlockWithCopy.config.addNodeView).toBe("function");
  });

  it("wires CodeBlockView into the node-view renderer when called with proper config context", () => {
    const addNodeView = CodeBlockWithCopy.config.addNodeView;
    type AddNodeViewContext = ThisParameterType<NonNullable<typeof addNodeView>>;
    const mockEditor = {} as AddNodeViewContext["editor"];
    const mockContext = {
      name: "codeBlock",
      options: {
        languageClassPrefix: "language-",
        exitOnTripleEnter: true,
        exitOnArrowDown: true,
        exitOnArrowUp: true,
        defaultLanguage: null,
        enableTabIndentation: false,
        tabSize: 4,
        HTMLAttributes: {},
      } satisfies CodeBlockOptions,
      storage: {},
      editor: mockEditor,
      type: {} as AddNodeViewContext["type"],
      parent: null,
    } as AddNodeViewContext;
    const nodeView = addNodeView?.call(mockContext);

    expect(renderNodeView).toHaveBeenCalledWith("code-block-view");
    expect(nodeView).toBe("node-view-renderer");
  });
});
