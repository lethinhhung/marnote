import { act, renderHook } from "@testing-library/react";
import { useEditorZoom, MAX_ZOOM, MIN_ZOOM } from "./useEditorZoom";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

const key = "marnote-editor-zoom";

describe("useEditorZoom", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to 100 when no saved zoom exists", () => {
    const { result } = renderHook(() => useEditorZoom());

    expect(result.current.zoom).toBe(100);
    expect(localStorage.getItem(key)).toBe("100");
  });

  it("loads saved zoom from localStorage", () => {
    localStorage.setItem(key, "120");

    const { result } = renderHook(() => useEditorZoom());

    expect(result.current.zoom).toBe(120);
  });

  it("defaults to 100 when localStorage has an invalid value", () => {
    localStorage.setItem(key, "not-a-number");

    const { result } = renderHook(() => useEditorZoom());

    expect(result.current.zoom).toBe(100);
    expect(localStorage.getItem(key)).toBe("100");
  });

  it("defaults to 100 when localStorage has a value below the minimum", () => {
    localStorage.setItem(key, "50");

    const { result } = renderHook(() => useEditorZoom());

    expect(result.current.zoom).toBe(100);
    expect(localStorage.getItem(key)).toBe("100");
  });

  it("defaults to 100 when localStorage has a value above the maximum", () => {
    localStorage.setItem(key, "200");

    const { result } = renderHook(() => useEditorZoom());

    expect(result.current.zoom).toBe(100);
    expect(localStorage.getItem(key)).toBe("100");
  });

  it("decreases zoom", () => {
    localStorage.setItem(key, "100");

    const { result } = renderHook(() => useEditorZoom());

    act(() => {
      result.current.decrease();
    });

    expect(result.current.zoom).toBe(90);
    expect(localStorage.getItem(key)).toBe("90");
  });

  it("does not decrease below the minimum zoom", () => {
    localStorage.setItem(key, String(MIN_ZOOM));

    const { result } = renderHook(() => useEditorZoom());

    act(() => {
      result.current.decrease();
    });

    expect(result.current.zoom).toBe(MIN_ZOOM);
    expect(localStorage.getItem(key)).toBe(String(MIN_ZOOM));
  });

  it("increases zoom and clamps at the maximum", () => {
    localStorage.setItem(key, String(MAX_ZOOM));

    const { result } = renderHook(() => useEditorZoom());

    act(() => {
      result.current.increase();
    });

    expect(result.current.zoom).toBe(MAX_ZOOM);
    expect(localStorage.getItem(key)).toBe(String(MAX_ZOOM));
  });

  it("resets zoom to 100", () => {
    localStorage.setItem(key, "150");

    const { result } = renderHook(() => useEditorZoom());

    act(() => {
      result.current.reset();
    });

    expect(result.current.zoom).toBe(100);
    expect(localStorage.getItem(key)).toBe("100");
  });
});
