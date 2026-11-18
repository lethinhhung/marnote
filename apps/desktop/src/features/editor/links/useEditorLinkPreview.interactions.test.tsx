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

describe("useEditorLinkPreview - workspace links and actions", () => {
  it("shows workspace link preview for note entry", () => {
    const goTo = vi.fn();
    const entries: Entry[] = [
      { name: "Note.md", path: "Note.md", kind: "file" },
      { name: "Folder", path: "Folder", kind: "directory" },
    ];
    const { unmount } = renderPreview({ goTo, entries, children: <a href="Note.md" data-testid="note-link">Note</a> });

    const link = screen.getByTestId("note-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Note · Note.md")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(goTo).toHaveBeenCalledWith("Note.md");
    unmount();
  });

  it("shows workspace link preview for folder entry", () => {
    const goTo = vi.fn();
    const entries: Entry[] = [{ name: "Folder", path: "Folder", kind: "directory" }];
    const { unmount } = renderPreview({ goTo, entries, children: <a href="Folder" data-testid="folder-link">Folder</a> });

    const link = screen.getByTestId("folder-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Folder · Folder")).toBeInTheDocument();
    unmount();
  });

  it("shows unavailable status for missing workspace link", () => {
    const goTo = vi.fn();
    const { unmount } = renderPreview({ goTo, children: <a href="Missing.md" data-testid="missing-link">Missing</a> });

    const link = screen.getByTestId("missing-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));

    expect(screen.getByText("Unavailable · notes/Missing.md")).toBeInTheDocument();
    const openButton = screen.getByRole("button", { name: "Open link" });
    expect(openButton).toBeDisabled();
    expect(openButton).toHaveTextContent("Unavailable");
    unmount();
  });

  it("copies link to clipboard", async () => {
    const goTo = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com" data-testid="copy-link">Example</a> });

    const link = screen.getByTestId("copy-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    fireEvent.click(screen.getByRole("button", { name: "Copy address" }));

    expect(writeText).toHaveBeenCalledWith("https://example.com");
    await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
    unmount();
  });

  it("dispatches edit link event", () => {
    const goTo = vi.fn();
    const dispatchEvent = vi.spyOn(document, "dispatchEvent");
    const { unmount } = renderPreview({ goTo, children: <a href="https://example.com" data-testid="edit-link">Example</a> });

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
    unmount();
  });

  it("removes link on unlink click", () => {
    const goTo = vi.fn();
    const chainMock = vi.fn(() => ({
      focus: vi.fn(() => ({
        setTextSelection: vi.fn(() => ({
          unsetLink: vi.fn(() => ({ run: vi.fn() })),
        })),
      })),
    }));
    const editor = setupEditor({ chain: chainMock } as unknown as Partial<Editor>);
    const { unmount } = renderPreview({ goTo, editor, children: <a href="https://example.com" data-testid="unlink-link">Example</a> });

    const link = screen.getByTestId("unlink-link");
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue(mockRect());

    act(() => fireEvent.mouseOver(link));
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));

    expect(editor.chain).toHaveBeenCalled();
    unmount();
  });
});