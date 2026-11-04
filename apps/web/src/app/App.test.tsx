import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const { QuotaExceededError, download, workspace } = vi.hoisted(() => {
  class QuotaExceededError extends Error {
    constructor(message = "Storage quota exceeded") {
      super(message);
      this.name = "QuotaExceededError";
    }
  }

  return {
    QuotaExceededError,
    download: vi.fn(),
    workspace: {
      tree: { path: "workspace-root", entries: [{ kind: "file", path: "folder/selected.md" }] },
      note: { path: "folder/selected.md", content: "hello" }, error: "", setError: vi.fn(),
      openLastOrDefault: vi.fn(), save: vi.fn(), select: vi.fn(), clearNote: vi.fn(),
      create: vi.fn(), exportWorkspace: vi.fn(), importWorkspace: vi.fn(),
    },
  };
});

const noteEditorMock = vi.hoisted(() => ({
  NoteEditor: vi.fn(({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  )),
}));

const noteFooterMock = vi.hoisted(() => ({
  NoteFooter: vi.fn(({ saveStatus }: { saveStatus: "saved" | "saving" | "error" }) => (
    <div data-testid="note-footer" data-save-status={saveStatus} />
  )),
}));

vi.mock("../platform/workspace", () => ({ downloadNoteAsMarkdown: download, QuotaExceededError }));
vi.mock("../features/workspace/state/useWorkspace", () => ({ useWorkspace: () => workspace }));
vi.mock("../shared/theme/useTheme", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("./useExplorerLayout", () => ({ useExplorerLayout: () => ({ collapsed: false, width: 240, toggle: vi.fn(), resize: vi.fn() }) }));
vi.mock("./useSaveMode", () => ({ useSaveMode: () => ({ mode: "automatic", setMode: vi.fn() }) }));
vi.mock("./useUnsavedChangesPrompt", () => ({ useUnsavedChangesPrompt: () => ({ ask: vi.fn(), dialog: null }) }));
vi.mock("../shared/ui/searchActions", () => ({ createSearchActions: () => ({ create: vi.fn() }) }));
vi.mock("../shared/ui/HeaderBar", () => ({ HeaderBar: ({ extraActions }: { extraActions: React.ReactNode }) => <header>{extraActions}</header> }));
vi.mock("../features/workspace/sidebar/WorkspaceSidebar", () => ({ WorkspaceSidebar: () => null }));
vi.mock("../features/workspace/layout/ExplorerSplitter", () => ({ ExplorerSplitter: () => null }));
vi.mock("../features/editor/NoteFooter", () => noteFooterMock);
vi.mock("../features/editor/NoteEditor", () => noteEditorMock);
vi.mock("../shared/ui/NoteTabs", () => ({ NoteTabs: () => null }));

describe("App Markdown download action", () => {
  beforeEach(() => {
    download.mockReset().mockResolvedValue({ content: "hello", filename: "selected-note.md" });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:markdown") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    noteEditorMock.NoteEditor.mockImplementation(() => <></>);
  });

  it("downloads the selected note using the platform returned Markdown filename", async () => {
    let downloadedName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Download note as Markdown" }));

    await waitFor(() => expect(download).toHaveBeenCalledWith("workspace-root", "folder/selected.md"));
    await waitFor(() => expect(downloadedName).toBe("selected-note.md"));
  });
});

describe("App autosave quota failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    workspace.save.mockReset();
    workspace.note = { path: "folder/selected.md", content: "hello" };
    workspace.tree = { path: "workspace-root", entries: [{ kind: "file", path: "folder/selected.md" }] };
    workspace.error = "";
    workspace.setError.mockReset();

    noteEditorMock.NoteEditor.mockImplementation(({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
      <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
    ));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows save error status and retains draft when quota is exceeded during autosave", async () => {
    // Mock save to return false and call setError (simulating quota error handled by useWorkspace.save)
    workspace.save.mockImplementation(async () => {
      workspace.setError("Failed to write file: storage quota exceeded");
      return false;
    });

    render(<App />);

    const editor = screen.getByTestId("editor");
    await act(async () => {
      fireEvent.change(editor, { target: { value: "hello world" } });
    });

    // Run all pending timers
    await act(async () => {
      vi.runAllTimers();
    });

    // Flush any pending microtasks
    await act(async () => {});

    const footer = screen.getByTestId("note-footer");
    expect(footer.getAttribute("data-save-status")).toBe("error");

    expect(editor).toHaveValue("hello world");
    expect(workspace.setError).toHaveBeenCalledWith(expect.stringContaining("quota"));
  });

  it("allows retry after quota failure by triggering saveNow", async () => {
    let failOnce = true;
    workspace.save.mockImplementation(async () => {
      if (failOnce) {
        failOnce = false;
        workspace.setError("Failed to write file: storage quota exceeded");
        return false;
      }
      workspace.setError("");
      return true;
    });

    render(<App />);

    const editor = screen.getByTestId("editor");
    await act(async () => {
      fireEvent.change(editor, { target: { value: "hello world" } });
    });

    // Run all pending timers
    await act(async () => {
      vi.runAllTimers();
    });

    // Flush any pending microtasks
    await act(async () => {});

    const footer = screen.getByTestId("note-footer");
    expect(footer.getAttribute("data-save-status")).toBe("error");

    expect(editor).toHaveValue("hello world");

    failOnce = false;
    await act(async () => {
      // Trigger manual save via Ctrl+S
      fireEvent.keyDown(window, { key: "s", ctrlKey: true, metaKey: false });
    });

    // Run timers for saveNow
    await act(async () => {
      vi.runAllTimers();
    });

    // Flush any pending microtasks
    await act(async () => {});

    const footerAfterRetry = screen.getByTestId("note-footer");
    expect(footerAfterRetry.getAttribute("data-save-status")).toBe("saved");
  });
});