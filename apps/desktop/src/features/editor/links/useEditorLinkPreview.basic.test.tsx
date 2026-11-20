import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import type { Entry } from "../../../shared/domain/workspace";
import { useEditorLinkPreview } from "./useEditorLinkPreview";

function TestWrapper({ editor, entries, path, goTo, children }: { editor: Editor | null; entries: Entry[]; path: string; goTo: (href: string) => void; children: React.ReactNode }) {
  const linkHover = useEditorLinkPreview({ editor, entries, path, goTo });
  return (
    <div
      onMouseOverCapture={linkHover.onMouseOverCapture}
      onMouseOutCapture={linkHover.onMouseOutCapture}
      onFocusCapture={linkHover.onFocusCapture}
    >
      <div className="editor-prose">{children}</div>
      {linkHover.overlay}
    </div>
  );
}

function mockRect(overrides: Partial<DOMRect> = {}) {
  return {
    left: 40,
    bottom: 80,
    right: 200,
    top: 60,
    width: 160,
    height: 20,
    x: 40,
    y: 60,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

function setupEditor(overrides: Partial<Editor> = {}) {
  return {
    view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    ...overrides,
  } as unknown as Editor;
}

function renderPreview({ editor = setupEditor(), entries = [], path = "notes/current.md", goTo = vi.fn(), children }: { editor?: Editor; entries?: Entry[]; path?: string; goTo?: ReturnType<typeof vi.fn>; children: React.ReactNode }) {
  const { unmount } = render(
    <TestWrapper editor={editor} entries={entries} path={path} goTo={goTo}>{children}</TestWrapper>
  );
  return { goTo, unmount };
}

describe("useEditorLinkPreview - basic preview", () => {
  it("shows a preview for an editor link and opens it", () => {
    const goTo = vi.fn();
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com/article" data-testid="test-link">Read article</a> });

    const link = screen.getByTestId("test-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("https://example.com/article")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(goTo).toHaveBeenCalledWith("https://example.com/article");
    unmount();
  });

  it("shows preview on focus capture", () => {
    const goTo = vi.fn();
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com" data-testid="focus-link">Example</a> });

    const link = screen.getByTestId("focus-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.focus(link));

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    unmount();
  });

  it("hides preview on mouse leave", async () => {
    const goTo = vi.fn();
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com" data-testid="leave-link">Example</a> });

    const link = screen.getByTestId("leave-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();

    act(() => fireEvent.mouseOut(link, { relatedTarget: document.body }));
    await waitFor(() => expect(screen.queryByText("https://example.com")).not.toBeInTheDocument());
    unmount();
  });

  it("keeps preview open when mouse enters overlay", () => {
    const goTo = vi.fn();
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com" data-testid="overlay-link">Example</a> });

    const link = screen.getByTestId("overlay-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();

    const overlay = screen.getByText("https://example.com").closest(".editor-link-preview");
    act(() => fireEvent.mouseOut(link, { relatedTarget: overlay }));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    unmount();
  });
});