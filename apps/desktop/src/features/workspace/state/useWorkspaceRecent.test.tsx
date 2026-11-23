import { act, renderHook } from "@testing-library/react";
import { useWorkspaceRecent } from "./useWorkspaceRecent";
import { loadRecentWorkspaces, rememberRecentWorkspace } from "./recentWorkspaces";
import { openWorkspace, openDefaultWorkspace } from "../../../platform/workspace";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("./recentWorkspaces", () => ({
  loadRecentWorkspaces: vi.fn(() => []),
  rememberRecentWorkspace: vi.fn((current: string[], path: string) => [path, ...current.filter((p: string) => p !== path)]),
}));

vi.mock("../../../platform/workspace", () => ({
  openWorkspace: vi.fn(),
  openDefaultWorkspace: vi.fn(),
}));

describe("useWorkspaceRecent", () => {
  const mockSetTree = vi.fn();
  const mockSetNote = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSetTree.mockClear();
    mockSetNote.mockClear();
    mockSetError.mockClear();
    vi.mocked(loadRecentWorkspaces).mockReturnValue([]);
  });

  it("initializes recent from localStorage", () => {
    vi.mocked(loadRecentWorkspaces).mockReturnValue(["/ws1", "/ws2"]);

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    expect(result.current.recent).toEqual(["/ws1", "/ws2"]);
  });

  it("opens a workspace and remembers it", async () => {
    const mockTree = { name: "ws1", path: "/ws1", entries: [] };
    vi.mocked(openWorkspace).mockResolvedValue(mockTree);

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.open("/ws1");
    });

    expect(openWorkspace).toHaveBeenCalledWith("/ws1");
    expect(mockSetTree).toHaveBeenCalledWith(mockTree);
    expect(mockSetNote).toHaveBeenCalledWith(null);
    expect(rememberRecentWorkspace).toHaveBeenCalledWith([], "/ws1");
  });

  it("opens default workspace and remembers it", async () => {
    const mockTree = { name: "default", path: "/default", entries: [] };
    vi.mocked(openDefaultWorkspace).mockResolvedValue(mockTree);

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.openDefault();
    });

    expect(openDefaultWorkspace).toHaveBeenCalled();
    expect(mockSetTree).toHaveBeenCalledWith(mockTree);
    expect(mockSetNote).toHaveBeenCalledWith(null);
    expect(rememberRecentWorkspace).toHaveBeenCalledWith([], "/default");
  });

  it("opens last recent workspace on success", async () => {
    vi.mocked(loadRecentWorkspaces).mockReturnValue(["/ws1", "/ws2"]);
    const mockTree = { name: "ws1", path: "/ws1", entries: [] };
    vi.mocked(openWorkspace).mockResolvedValue(mockTree);

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.openLastOrDefault();
    });

    expect(openWorkspace).toHaveBeenCalledWith("/ws1");
    expect(mockSetTree).toHaveBeenCalledWith(mockTree);
    expect(mockSetNote).toHaveBeenCalledWith(null);
    expect(rememberRecentWorkspace).toHaveBeenCalledWith(["/ws1", "/ws2"], "/ws1");
  });

  it("falls back to default workspace when last recent fails to open", async () => {
    vi.mocked(loadRecentWorkspaces).mockReturnValue(["/ws1"]);
    vi.mocked(openWorkspace).mockRejectedValue(new Error("not found"));
    const mockDefaultTree = { name: "default", path: "/default", entries: [] };
    vi.mocked(openDefaultWorkspace).mockResolvedValue(mockDefaultTree);

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.openLastOrDefault();
    });

    expect(openWorkspace).toHaveBeenCalledWith("/ws1");
    expect(openDefaultWorkspace).toHaveBeenCalled();
    expect(mockSetTree).toHaveBeenCalledWith(mockDefaultTree);
    expect(mockSetNote).toHaveBeenCalledWith(null);
    expect(rememberRecentWorkspace).toHaveBeenCalledWith(["/ws1"], "/default");
  });

  it("sets error when opening workspace fails and no fallback", async () => {
    vi.mocked(loadRecentWorkspaces).mockReturnValue(["/ws1"]);
    vi.mocked(openWorkspace).mockRejectedValue(new Error("not found"));
    vi.mocked(openDefaultWorkspace).mockRejectedValue(new Error("no default"));

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.openLastOrDefault();
    });

    expect(mockSetError).toHaveBeenCalledWith("Error: no default");
  });

  it("sets error when open workspace throws", async () => {
    vi.mocked(openWorkspace).mockRejectedValue(new Error("permission denied"));

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.open("/ws1");
    });

    expect(mockSetError).toHaveBeenCalledWith("Error: permission denied");
  });

  it("clears error before running new task", async () => {
    vi.mocked(openWorkspace).mockResolvedValue({ name: "ws1", path: "/ws1", entries: [] });

    const { result } = renderHook(() =>
      useWorkspaceRecent({ setTree: mockSetTree, setNote: mockSetNote, setError: mockSetError })
    );

    await act(async () => {
      await result.current.open("/ws1");
    });

    expect(mockSetError).toHaveBeenCalledWith("");
  });
});