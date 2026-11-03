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

describe("useEditorLinkPreview", () => {
  it("shows a preview for an editor link and opens it", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com/article" data-testid="test-link">
          Read article
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("test-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("https://example.com/article")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(goTo).toHaveBeenCalledWith("https://example.com/article");
  });

  it("shows workspace link preview for note entry", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;
    const entries: Entry[] = [
      { name: "Note.md", path: "Note.md", kind: "file" },
      { name: "Folder", path: "Folder", kind: "directory" },
    ];

    render(
      <TestWrapper editor={editor} entries={entries} path="notes/current.md" goTo={goTo}>
        <a href="Note.md" data-testid="note-link">
          Note
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("note-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Note · Note.md")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(goTo).toHaveBeenCalledWith("Note.md");
  });

  it("shows workspace link preview for folder entry", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;
    const entries: Entry[] = [{ name: "Folder", path: "Folder", kind: "directory" }];

    render(
      <TestWrapper editor={editor} entries={entries} path="notes/current.md" goTo={goTo}>
        <a href="Folder" data-testid="folder-link">
          Folder
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("folder-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Folder · Folder")).toBeInTheDocument();
  });

  it("shows unavailable status for missing workspace link", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="Missing.md" data-testid="missing-link">
          Missing
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("missing-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Unavailable · notes/Missing.md")).toBeInTheDocument();
    const openButton = screen.getByRole("button", { name: "Open link" });
    expect(openButton).toBeDisabled();
    expect(openButton).toHaveTextContent("Unavailable");
  });

  it("copies link to clipboard", async () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="copy-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("copy-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    fireEvent.click(screen.getByRole("button", { name: "Copy address" }));

    expect(writeText).toHaveBeenCalledWith("https://example.com");
    await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
  });

  it("dispatches edit link event", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;
    const dispatchEvent = vi.spyOn(document, "dispatchEvent");

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="edit-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("edit-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "marnote-edit-link",
        detail: expect.objectContaining({ href: "https://example.com", text: "Example" }),
      })
    );
  });

  it("removes link on unlink click", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          setTextSelection: vi.fn(() => ({
            unsetLink: vi.fn(() => ({ run: vi.fn() })),
          })),
        })),
      })),
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="unlink-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("unlink-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));

    expect(editor.chain).toHaveBeenCalled();
  });

  it("shows preview on focus capture", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="focus-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("focus-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.focus(link));

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("hides preview on mouse leave", async () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="leave-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("leave-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();

    act(() => fireEvent.mouseOut(link, { relatedTarget: document.body }));
    await waitFor(() => expect(screen.queryByText("https://example.com")).not.toBeInTheDocument());
  });

  it("keeps preview open when mouse enters overlay", () => {
    const goTo = vi.fn();
    const editor = {
      view: { posAtDOM: vi.fn((_node: Node, offset: number) => offset ? 8 : 4) },
    } as unknown as Editor;

    render(
      <TestWrapper editor={editor} entries={[]} path="notes/current.md" goTo={goTo}>
        <a href="https://example.com" data-testid="overlay-link">
          Example
        </a>
      </TestWrapper>
    );

    const link = screen.getByTestId("overlay-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();

    const overlay = screen.getByText("https://example.com").closest(".editor-link-preview");
    act(() => fireEvent.mouseOut(link, { relatedTarget: overlay }));
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });
});