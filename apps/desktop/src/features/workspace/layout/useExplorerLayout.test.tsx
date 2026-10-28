import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExplorerLayout } from "./useExplorerLayout";

const KEY = "marnote-explorer-layout";

describe("useExplorerLayout", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    });
  });

  it("uses and persists the default layout", () => {
    const { result } = renderHook(() => useExplorerLayout());

    expect(result.current.width).toBe(260);
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ width: 260, collapsed: false }));
  });

  it("loads a persisted layout", () => {
    localStorage.setItem(KEY, JSON.stringify({ width: 340, collapsed: true }));

    const { result } = renderHook(() => useExplorerLayout());

    expect(result.current.width).toBe(340);
    expect(result.current.collapsed).toBe(true);
  });

  it("falls back to defaults when stored JSON is malformed", () => {
    localStorage.setItem(KEY, "{bad json");

    const { result } = renderHook(() => useExplorerLayout());

    expect(result.current.width).toBe(260);
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ width: 260, collapsed: false }));
  });

  it("persists resize, toggle, and collapse actions", () => {
    const { result } = renderHook(() => useExplorerLayout());

    act(() => result.current.resize(400));
    expect(result.current.width).toBe(400);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ width: 400, collapsed: false }));

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ width: 400, collapsed: true }));

    act(() => result.current.collapse());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ width: 400, collapsed: true }));
  });
});
