import { act, renderHook } from "@testing-library/react";
import { useSaveMode } from "./useSaveMode";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const key = "marnote-save-mode";

describe("useSaveMode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to automatic when no saved value exists", () => {
    const { result } = renderHook(() => useSaveMode());

    expect(result.current.mode).toBe("automatic");
    expect(localStorage.getItem(key)).toBe("automatic");
  });

  it("loads manual mode from localStorage", () => {
    localStorage.setItem(key, "manual");

    const { result } = renderHook(() => useSaveMode());

    expect(result.current.mode).toBe("manual");
  });

  it("defaults to automatic when localStorage has invalid value", () => {
    localStorage.setItem(key, "invalid");

    const { result } = renderHook(() => useSaveMode());

    expect(result.current.mode).toBe("automatic");
    expect(localStorage.getItem(key)).toBe("automatic");
  });

  it("persists mode change to automatic", () => {
    localStorage.setItem(key, "manual");

    const { result } = renderHook(() => useSaveMode());

    expect(result.current.mode).toBe("manual");

    act(() => {
      result.current.setMode("automatic");
    });

    expect(result.current.mode).toBe("automatic");
    expect(localStorage.getItem(key)).toBe("automatic");
  });

  it("persists mode change to manual", () => {
    const { result } = renderHook(() => useSaveMode());

    expect(result.current.mode).toBe("automatic");

    act(() => {
      result.current.setMode("manual");
    });

    expect(result.current.mode).toBe("manual");
    expect(localStorage.getItem(key)).toBe("manual");
  });

  it("returns setter function that updates mode", () => {
    const { result } = renderHook(() => useSaveMode());

    expect(typeof result.current.setMode).toBe("function");

    act(() => {
      result.current.setMode("manual");
    });

    expect(result.current.mode).toBe("manual");
  });
});