import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import type { Entry, WorkspaceTree } from "./workspaceTypes";

const { isDesktop, openWorkspaceFolder } = vi.hoisted(() => ({ isDesktop: vi.fn(), openWorkspaceFolder: vi.fn() }));
vi.mock("../../platform/dialog", () => ({ isDesktop, openWorkspaceFolder }));

const entry: Entry = { name: "Note.md", path: "Note.md", kind: "file" };
const tree: WorkspaceTree = { name: "My workspace", path: "/workspace", entries: [entry] };
const noop = vi.fn();
const makeProps = (overrides: Partial<React.ComponentProps<typeof WorkspaceSidebar>> = {}) => ({
  tree, selected: "Note.md", recent: ["/other/work"], width: 280, collapsed: false, peekOpen: false,
  trash: [], onListTrash: noop, onRestoreTrash: noop, onEmptyTrash: noop, onDefault: noop, onOpen: noop,
  onSelect: noop, onCreate: noop, onCreateFolder: noop, onRename: noop, onDelete: noop,
  onMove: vi.fn(async () => true), onReorder: vi.fn(async () => true), ...overrides,
});

describe("WorkspaceSidebar", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("composes workspace controls and Explorer options", async () => {
    const user = userEvent.setup();
    render(<WorkspaceSidebar {...makeProps()} />);
    expect(screen.getByRole("complementary", { name: "Explorer" })).toHaveStyle({ width: "280px" });
    expect(screen.getByRole("button", { name: "My Notes" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Switch workspace" })).toHaveValue("/workspace");
    expect(screen.getByRole("combobox", { name: "Sort Explorer" })).toHaveValue("name");
    expect(screen.getByRole("button", { name: "New Markdown note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New folder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename / move selected note" })).toBeEnabled();
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort Explorer" }), "modified");
    expect(screen.getByRole("combobox", { name: "Sort Explorer" })).toHaveValue("modified");
    await user.click(screen.getByRole("button", { name: "Hide folders without notes" }));
    expect(screen.getByRole("button", { name: "Show folders without notes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("creates a note under the selected note's parent", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<WorkspaceSidebar {...makeProps({ tree: { ...tree, entries: [{ name: "Projects", path: "Projects", kind: "directory", children: [entry] }] }, selected: "Projects/Note.md", onCreate })} />);
    await user.click(screen.getByRole("button", { name: "New Markdown note" }));
    const editor = screen.getByRole("textbox", { name: "Note name" });
    expect(editor).toHaveValue("Untitled");
    await user.clear(editor);
    await user.type(editor, "Draft{Enter}");
    expect(onCreate).toHaveBeenCalledWith("Projects/Draft.md");
  });

  it("opens workspace trash and delegates restore and empty actions", async () => {
    const user = userEvent.setup();
    const onRestoreTrash = vi.fn();
    const onEmptyTrash = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<WorkspaceSidebar {...makeProps({ trash: [{ id: "t1", path: "Old.md", kind: "file", restorable: true }], onRestoreTrash, onEmptyTrash })} />);
    await user.click(screen.getByRole("button", { name: "Workspace trash" }));
    expect(screen.getByRole("dialog", { name: "Workspace trash" })).toBeInTheDocument();
    expect(noop).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Restore Old.md" }));
    expect(onRestoreTrash).toHaveBeenCalledWith("t1");
    await user.click(screen.getByRole("button", { name: "Empty trash" }));
    expect(onEmptyTrash).toHaveBeenCalledOnce();
  });

  it("opens a workspace with the desktop picker and reports web fallback", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    isDesktop.mockReturnValue(true);
    openWorkspaceFolder.mockResolvedValue("/picked");
    const view = render(<WorkspaceSidebar {...makeProps({ onOpen })} />);
    await user.click(screen.getByRole("button", { name: "Open workspace..." }));
    expect(openWorkspaceFolder).toHaveBeenCalledWith({ defaultPath: "/workspace", title: "Open workspace folder" });
    expect(onOpen).toHaveBeenCalledWith("/picked");
    view.rerender(<WorkspaceSidebar {...makeProps({ onOpen })} />);
    isDesktop.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Open workspace..." }));
    expect(screen.getByRole("alert")).toHaveTextContent("Folder browsing works in the Marnote desktop app");
  });
});
