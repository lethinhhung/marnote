import { act, renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const originalMatchMedia = window.matchMedia;

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    window.matchMedia = originalMatchMedia;
  });

  it("defaults to dark when system prefers dark", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: _query === "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("defaults to light when system prefers light", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
  });

  it("loads saved theme from localStorage", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    localStorage.setItem("marnote-theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("loads light theme from localStorage even if system prefers dark", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    localStorage.setItem("marnote-theme", "light");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
  });

  it("ignores invalid localStorage value and uses system preference", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    localStorage.setItem("marnote-theme", "invalid");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("toggles theme and persists to localStorage", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("marnote-theme")).toBe("dark");
  });

  it("toggles from dark to light and persists", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    localStorage.setItem("marnote-theme", "dark");

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("marnote-theme")).toBe("light");
  });

  it("updates document theme attribute and meta tag on change", () => {
    window.matchMedia = vi.fn().mockImplementation((_query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);

    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(meta.getAttribute("content")).toBe("#f6f5f2");

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(meta.getAttribute("content")).toBe("#121316");

    meta.remove();
  });
});