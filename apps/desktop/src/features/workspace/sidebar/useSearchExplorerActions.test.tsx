import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useSearchExplorerActions } from "./useSearchExplorerActions";

describe("useSearchExplorerActions", () => {
  let setEditMock: ReturnType<typeof vi.fn>;
  let setSelectedFolderMock: ReturnType<typeof vi.fn>;
  let setTreeFocusMock: ReturnType<typeof vi.fn>;
  let setHideFoldersMock: ReturnType<typeof vi.fn>;
  let onDeleteMock: ReturnType<typeof vi.fn>;
  let onTargetChangeMock: ReturnType<typeof vi.fn>;
  let confirmMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setEditMock = vi.fn();
    setSelectedFolderMock = vi.fn();
    setTreeFocusMock = vi.fn();
    setHideFoldersMock = vi.fn();
    onDeleteMock = vi.fn();
    onTargetChangeMock = vi.fn();
    confirmMock = vi.fn().mockReturnValue(true);
    vi.spyOn(window, "confirm").mockImplementation(confirmMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderHookWithProps(props: Partial<{
    setEdit: typeof setEditMock;
    setSelectedFolder: typeof setSelectedFolderMock;
    setTreeFocus: typeof setTreeFocusMock;
    setHideFolders: typeof setHideFoldersMock;
    selected: string;
    selectedFolder: string;
    onDelete: typeof onDeleteMock;
    onTargetChange: typeof onTargetChangeMock;
  }> = {}) {
    return renderHook(() => useSearchExplorerActions({
      setEdit: props.setEdit ?? setEditMock,
      setSelectedFolder: props.setSelectedFolder ?? setSelectedFolderMock,
      setTreeFocus: props.setTreeFocus ?? setTreeFocusMock,
      setHideFolders: props.setHideFolders ?? setHideFoldersMock,
      selected: props.selected ?? "note.md",
      selectedFolder: props.selectedFolder ?? "folder",
      onDelete: props.onDelete ?? onDeleteMock,
      onTargetChange: props.onTargetChange ?? onTargetChangeMock,
    }));
  }

  it("handles rename-note event", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-rename", {
        detail: { path: "folder/note.md", kind: "file" },
      }));
    });

    expect(setHideFoldersMock).toHaveBeenCalledWith(false);
    expect(setTreeFocusMock).toHaveBeenCalledWith("note");
    expect(onTargetChangeMock).toHaveBeenCalledWith("folder/note.md", "note");
    expect(setEditMock).toHaveBeenCalledWith({
      kind: "rename-note",
      path: "folder/note.md",
      value: "note.md",
    });
  });

  it("handles rename-folder event", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-rename", {
        detail: { path: "folder/subfolder", kind: "directory" },
      }));
    });

    expect(setHideFoldersMock).toHaveBeenCalledWith(false);
    expect(setSelectedFolderMock).toHaveBeenCalledWith("folder/subfolder");
    expect(setTreeFocusMock).toHaveBeenCalledWith("folder");
    expect(onTargetChangeMock).toHaveBeenCalledWith("folder/subfolder", "folder");
    expect(setEditMock).toHaveBeenCalledWith({
      kind: "rename-folder",
      path: "folder/subfolder",
      value: "subfolder",
    });
  });

  it("handles confirmed remove-note event", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder/note.md", kind: "file" },
      }));
    });

    expect(confirmMock).toHaveBeenCalledWith("Move this note to the workspace trash?");
    expect(onDeleteMock).toHaveBeenCalledWith("folder/note.md");
    expect(setSelectedFolderMock).not.toHaveBeenCalled();
    expect(setTreeFocusMock).not.toHaveBeenCalled();
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });

  it("handles confirmed remove-folder event", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder/subfolder", kind: "directory" },
      }));
    });

    expect(confirmMock).toHaveBeenCalledWith("Move this folder and all its contents to the workspace trash?");
    expect(onDeleteMock).toHaveBeenCalledWith("folder/subfolder");
    expect(setSelectedFolderMock).not.toHaveBeenCalled();
    expect(setTreeFocusMock).not.toHaveBeenCalled();
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });

  it("clears focus when selected folder is deleted", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder", kind: "directory" },
      }));
    });

    expect(onDeleteMock).toHaveBeenCalledWith("folder");
    expect(setSelectedFolderMock).toHaveBeenCalledWith("");
    expect(setTreeFocusMock).toHaveBeenCalledWith("note");
    expect(onTargetChangeMock).toHaveBeenCalledWith("note.md", "note");
  });

  it("clears focus when selected folder is descendant of deleted folder", () => {
    renderHookWithProps({ selectedFolder: "folder/subfolder" });

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder", kind: "directory" },
      }));
    });

    expect(onDeleteMock).toHaveBeenCalledWith("folder");
    expect(setSelectedFolderMock).toHaveBeenCalledWith("");
    expect(setTreeFocusMock).toHaveBeenCalledWith("note");
    expect(onTargetChangeMock).toHaveBeenCalledWith("note.md", "note");
  });

  it("does not clear focus when unrelated folder is deleted", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "other/folder", kind: "directory" },
      }));
    });

    expect(onDeleteMock).toHaveBeenCalledWith("other/folder");
    expect(setSelectedFolderMock).not.toHaveBeenCalled();
    expect(setTreeFocusMock).not.toHaveBeenCalled();
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });

  it("does not call onTargetChange when selected note is inside deleted folder", () => {
    renderHookWithProps({ selected: "folder/subfolder/note.md", selectedFolder: "folder/subfolder" });

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder", kind: "directory" },
      }));
    });

    expect(onDeleteMock).toHaveBeenCalledWith("folder");
    expect(setSelectedFolderMock).toHaveBeenCalledWith("");
    expect(setTreeFocusMock).toHaveBeenCalledWith("note");
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });

  it("cancels deletion when confirm returns false", () => {
    confirmMock.mockReturnValue(false);
    const preventDefaultMock = vi.fn();

    renderHookWithProps();

    const event = new CustomEvent("marnote-search-remove", {
      detail: { path: "folder/note.md", kind: "file" },
      cancelable: true,
    });
    event.preventDefault = preventDefaultMock;

    act(() => {
      document.dispatchEvent(event);
    });

    expect(confirmMock).toHaveBeenCalledWith("Move this note to the workspace trash?");
    expect(preventDefaultMock).toHaveBeenCalled();
    expect(onDeleteMock).not.toHaveBeenCalled();
    expect(setSelectedFolderMock).not.toHaveBeenCalled();
    expect(setTreeFocusMock).not.toHaveBeenCalled();
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });

  it("cancels folder deletion when confirm returns false", () => {
    confirmMock.mockReturnValue(false);
    const preventDefaultMock = vi.fn();

    renderHookWithProps();

    const event = new CustomEvent("marnote-search-remove", {
      detail: { path: "folder/subfolder", kind: "directory" },
      cancelable: true,
    });
    event.preventDefault = preventDefaultMock;

    act(() => {
      document.dispatchEvent(event);
    });

    expect(confirmMock).toHaveBeenCalledWith("Move this folder and all its contents to the workspace trash?");
    expect(preventDefaultMock).toHaveBeenCalled();
    expect(onDeleteMock).not.toHaveBeenCalled();
  });

  it("ignores rename event without path", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-rename", {
        detail: { path: "", kind: "file" },
      }));
    });

    expect(setEditMock).not.toHaveBeenCalled();
    expect(setHideFoldersMock).not.toHaveBeenCalled();
  });

  it("ignores remove event without path", () => {
    renderHookWithProps();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "", kind: "file" },
      }));
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(onDeleteMock).not.toHaveBeenCalled();
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = renderHookWithProps();

    unmount();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-rename", {
        detail: { path: "folder/note.md", kind: "file" },
      }));
      document.dispatchEvent(new CustomEvent("marnote-search-remove", {
        detail: { path: "folder/note.md", kind: "file" },
      }));
    });

    expect(setEditMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("works without onTargetChange callback", () => {
    renderHook(() => useSearchExplorerActions({
      setEdit: setEditMock,
      setSelectedFolder: setSelectedFolderMock,
      setTreeFocus: setTreeFocusMock,
      setHideFolders: setHideFoldersMock,
      selected: "note.md",
      selectedFolder: "folder",
      onDelete: onDeleteMock,
    }));

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-search-rename", {
        detail: { path: "folder/note.md", kind: "file" },
      }));
    });

    expect(setEditMock).toHaveBeenCalledWith({
      kind: "rename-note",
      path: "folder/note.md",
      value: "note.md",
    });
    expect(onTargetChangeMock).not.toHaveBeenCalled();
  });
});