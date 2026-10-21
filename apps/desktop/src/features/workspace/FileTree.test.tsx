import { render, screen, cleanup, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { FileTree } from "./FileTree";
import type { Entry } from "./workspaceTypes";

const mockProps = {
  entries: [] as Entry[],
  manualOrder: {} as Record<string, string[]>,
  sort: "name" as const,
  selected: "",
  selectedFolder: "",
  focus: "note" as const,
  hideFoldersWithoutNotes: false,
  edit: null,
  onEditSubmit: vi.fn(),
  onEditCancel: vi.fn(),
  onOpen: vi.fn(),
  onFolderSelect: vi.fn(),
  onEntryContext: vi.fn(),
  onMove: vi.fn(),
  onReorder: vi.fn(),
};

function renderFileTree(entries: Entry[]) {
  return render(<FileTree {...mockProps} entries={entries} />);
}

describe("FileTree folder metadata display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("displays folder tags and timestamps when present", () => {
    const entries: Entry[] = [
      {
        name: "Projects",
        path: "Projects",
        kind: "directory",
        metadata: {
          tags: ["work", "active"],
          icon: "📁",
          favorite: true,
          createdMs: 1704067200000,
          updatedMs: 1704153600000,
        },
        children: [],
      },
    ];

    renderFileTree(entries);

    const folderButton = screen.getByRole("button", { name: /Projects/ });
    expect(folderButton).toBeInTheDocument();

    expect(within(folderButton).getByText("#work")).toBeInTheDocument();
    expect(within(folderButton).getByText("#active")).toBeInTheDocument();

    expect(within(folderButton).getAllByText(/Jan/)).toHaveLength(2);
    expect(within(folderButton).getAllByText(/2024/)).toHaveLength(2);

    expect(within(folderButton).getByTestId("tree-favorite")).toBeInTheDocument();
  });

  it("renders folder without optional metadata correctly", () => {
    const entries: Entry[] = [
      {
        name: "Empty",
        path: "Empty",
        kind: "directory",
        children: [],
      },
    ];

    renderFileTree(entries);

    const folderButton = screen.getByRole("button", { name: /Empty/ });
    expect(folderButton).toBeInTheDocument();

    expect(within(folderButton).queryByText("#work")).not.toBeInTheDocument();
    expect(within(folderButton).queryByText(/Jan/)).not.toBeInTheDocument();
    expect(within(folderButton).queryByTestId("tree-favorite")).not.toBeInTheDocument();
  });

  it("renders folder with only some metadata fields", () => {
    const entries: Entry[] = [
      {
        name: "Partial",
        path: "Partial",
        kind: "directory",
        metadata: {
          tags: ["solo"],
          createdMs: 1704067200000,
        },
        children: [],
      },
    ];

    renderFileTree(entries);

    const folderButton = screen.getByRole("button", { name: /Partial/ });
    expect(within(folderButton).getByText("#solo")).toBeInTheDocument();
    expect(within(folderButton).getAllByText(/Jan/)).toHaveLength(1);
    expect(within(folderButton).queryByTestId("tree-favorite")).not.toBeInTheDocument();
  });

  it("note tree rows retain existing metadata display (icon and favorite)", () => {
    const entries: Entry[] = [
      {
        name: "Note.md",
        path: "Note.md",
        kind: "file",
        metadata: {
          icon: "✨",
          favorite: true,
          tags: ["note-tag"],
          createdMs: 1704067200000,
          updatedMs: 1704153600000,
        },
      },
    ];

    renderFileTree(entries);

    const noteButton = screen.getByRole("button", { name: /Note.md/ });
    expect(noteButton).toBeInTheDocument();

    expect(within(noteButton).getByText("✨")).toBeInTheDocument();
    expect(within(noteButton).getByTestId("tree-favorite")).toBeInTheDocument();

    expect(within(noteButton).getByText("#note-tag")).toBeInTheDocument();
    expect(within(noteButton).queryByText(/Jan/)).not.toBeInTheDocument();
  });

  it("folder with emoji icon displays it", () => {
    const entries: Entry[] = [
      {
        name: "Emoji Folder",
        path: "Emoji Folder",
        kind: "directory",
        metadata: {
          icon: "🚀",
        },
        children: [],
      },
    ];

    renderFileTree(entries);

    const folderButton = screen.getByRole("button", { name: /Emoji Folder/ });
    expect(within(folderButton).getByText("🚀")).toBeInTheDocument();
  });

  it("folder favorite star is displayed when favorite is true", () => {
    const entries: Entry[] = [
      {
        name: "Fav Folder",
        path: "Fav Folder",
        kind: "directory",
        metadata: {
          favorite: true,
        },
        children: [],
      },
    ];

    renderFileTree(entries);

    const folderButton = screen.getByRole("button", { name: /Fav Folder/ });
    expect(within(folderButton).getByTestId("tree-favorite")).toBeInTheDocument();
  });
});
