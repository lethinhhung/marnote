import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const { download, workspace } = vi.hoisted(() => ({
  download: vi.fn(),
  workspace: {
    tree: { path: "workspace-root", entries: [{ kind: "file", path: "folder/selected.md" }] },
    note: { path: "folder/selected.md", content: "hello" }, error: "", setError: vi.fn(),
    openLastOrDefault: vi.fn(), save: vi.fn(), select: vi.fn(), clearNote: vi.fn(),
    create: vi.fn(), exportWorkspace: vi.fn(), importWorkspace: vi.fn(),
  },
}));

vi.mock("../platform/workspace", () => ({ downloadNoteAsMarkdown: download }));
vi.mock("../features/workspace/state/useWorkspace", () => ({ useWorkspace: () => workspace }));
vi.mock("../shared/theme/useTheme", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("./useExplorerLayout", () => ({ useExplorerLayout: () => ({ collapsed: false, width: 240, toggle: vi.fn(), resize: vi.fn() }) }));
vi.mock("./useAutosave", () => ({ useAutosave: () => ({ status: "saved", saveNow: vi.fn() }) }));
vi.mock("./useSaveMode", () => ({ useSaveMode: () => ({ mode: "automatic", setMode: vi.fn() }) }));
vi.mock("./useUnsavedChangesPrompt", () => ({ useUnsavedChangesPrompt: () => ({ ask: vi.fn(), dialog: null }) }));
vi.mock("./useNoteTabs", () => ({ useNoteTabs: () => ({
  tabs: ["folder/selected.md"], saveCurrent: vi.fn(async () => true), selectTab: vi.fn(),
  clearNote: vi.fn(), updateDraft: vi.fn(), create: vi.fn(), closeTab: vi.fn(), closeOthers: vi.fn(),
  closeAll: vi.fn(), reorder: vi.fn(),
}) }));
vi.mock("../shared/ui/searchActions", () => ({ createSearchActions: () => ({ create: vi.fn() }) }));
vi.mock("../shared/ui/HeaderBar", () => ({ HeaderBar: ({ extraActions }: { extraActions: React.ReactNode }) => <header>{extraActions}</header> }));
vi.mock("../features/workspace/sidebar/WorkspaceSidebar", () => ({ WorkspaceSidebar: () => null }));
vi.mock("../features/editor/NoteEditor", () => ({ NoteEditor: () => null }));
vi.mock("../shared/ui/NoteTabs", () => ({ NoteTabs: () => null }));
vi.mock("../features/workspace/layout/ExplorerSplitter", () => ({ ExplorerSplitter: () => null }));
vi.mock("../features/editor/NoteFooter", () => ({ NoteFooter: () => null }));

describe("App Markdown download action", () => {
  beforeEach(() => {
    download.mockReset().mockResolvedValue({ content: "hello", filename: "selected-note.md" });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:markdown") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
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
