import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { useTreeFolderFocus } from "./useTreeFolderFocus";

describe("useTreeFolderFocus", () => {
  let setExpandedMock: ReturnType<typeof vi.fn>;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    let expandedState = new Set<string>();
    setExpandedMock = vi.fn((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (typeof updater === "function") {
        expandedState = updater(expandedState);
      } else {
        expandedState = new Set(updater);
      }
      return expandedState;
    });
    scrollIntoViewMock = vi.fn();
    HTMLButtonElement.prototype.scrollIntoView = scrollIntoViewMock;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("expands ancestor folders and updates focus path on navigate event", () => {
    const hook = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    expect(hook.result.current).toBe("");

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "folder1/folder2/file.md" }));
    });

    expect(setExpandedMock).toHaveBeenCalled();
    expect(hook.result.current).toBe("folder1/folder2/file.md");
  });

  it("scrolls target row into view after focus path updates", () => {
    const button = document.createElement("button");
    button.className = "tree-item";
    button.dataset.path = "folder1/folder2/file.md";
    document.body.appendChild(button);

    renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "folder1/folder2/file.md" }));
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
    button.remove();
  });

  it("clears focus path after 4000ms timeout", () => {
    const hook = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "folder1/file.md" }));
    });

    expect(hook.result.current).toBe("folder1/file.md");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(hook.result.current).toBe("");
  });

  it("clears focus path immediately on clear event", () => {
    const hook = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "folder1/file.md" }));
    });

    expect(hook.result.current).toBe("folder1/file.md");

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-clear-folder-focus"));
    });

    expect(hook.result.current).toBe("");
  });

  it("does not expand or focus on empty path detail", () => {
    const hook = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "" }));
    });

    expect(setExpandedMock).not.toHaveBeenCalled();
    expect(hook.result.current).toBe("");
  });

  it("handles nested paths with multiple ancestors", () => {
    const hook = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "a/b/c/d/file.md" }));
    });

    expect(setExpandedMock).toHaveBeenCalled();
    expect(hook.result.current).toBe("a/b/c/d/file.md");
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useTreeFolderFocus(setExpandedMock as unknown as React.Dispatch<React.SetStateAction<Set<string>>>)
    );

    unmount();

    act(() => {
      document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: "folder/file.md" }));
    });

    expect(setExpandedMock).not.toHaveBeenCalled();
  });
});