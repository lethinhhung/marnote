import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useTheme } from "./useTheme";

const THEME_KEY = "marnote-theme";

function renderUseTheme() {
  let currentResult: ReturnType<typeof useTheme> | null = null;
  function TestComponent() {
    currentResult = useTheme();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<TestComponent />);
  });
  return {
    getResult: () => currentResult!,
    unmount: () => { root.unmount(); container.remove(); },
  };
}

async function flushEffects() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe("useTheme", () => {
  let matchMediaMock: { matches: boolean };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.remove();

    matchMediaMock = { matches: false };
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: matchMediaMock.matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })));
  });

  describe("initialization", () => {
    it("uses saved light theme from localStorage", () => {
      localStorage.setItem(THEME_KEY, "light");
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("light");
      unmount();
    });

    it("uses saved dark theme from localStorage", () => {
      localStorage.setItem(THEME_KEY, "dark");
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("dark");
      unmount();
    });

    it("falls back to system preference when no valid saved value", () => {
      localStorage.setItem(THEME_KEY, "invalid");
      matchMediaMock.matches = true;
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("dark");
      unmount();
    });

    it("falls back to light when system prefers light and no saved value", () => {
      matchMediaMock.matches = false;
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("light");
      unmount();
    });

    it("ignores invalid saved value and uses system preference", () => {
      localStorage.setItem(THEME_KEY, "not-a-theme");
      matchMediaMock.matches = true;
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("dark");
      unmount();
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark and persists to localStorage and document", async () => {
      localStorage.setItem(THEME_KEY, "light");
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("light");

      act(() => {
        getResult().toggleTheme();
      });
      await flushEffects();

      expect(getResult().theme).toBe("dark");
      expect(localStorage.getItem(THEME_KEY)).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      unmount();
    });

    it("toggles from dark to light and persists to localStorage and document", async () => {
      localStorage.setItem(THEME_KEY, "dark");
      const { getResult, unmount } = renderUseTheme();
      expect(getResult().theme).toBe("dark");

      act(() => {
        getResult().toggleTheme();
      });
      await flushEffects();

      expect(getResult().theme).toBe("light");
      expect(localStorage.getItem(THEME_KEY)).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
      unmount();
    });

    it("updates theme-color meta tag when toggling", async () => {
      localStorage.setItem(THEME_KEY, "light");
      // Create the meta tag since the hook only updates existing ones
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);

      const { getResult, unmount } = renderUseTheme();

      act(() => {
        getResult().toggleTheme();
      });
      await flushEffects();

      expect(meta.getAttribute("content")).toBe("#121316");

      act(() => {
        getResult().toggleTheme();
      });
      await flushEffects();

      expect(meta.getAttribute("content")).toBe("#f6f5f2");
      unmount();
    });

    it("does not throw when theme-color meta tag is missing", async () => {
      localStorage.setItem(THEME_KEY, "light");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.remove();

      const { getResult, unmount } = renderUseTheme();

      await act(async () => {
        getResult().toggleTheme();
      });
      await flushEffects();

      // Should not throw, just silently skip
      expect(document.documentElement.dataset.theme).toBe("dark");
      unmount();
    });
  });

  describe("effects on mount", () => {
    it("applies theme to document.documentElement.dataset.theme on mount", async () => {
      localStorage.setItem(THEME_KEY, "dark");
      const { unmount } = renderUseTheme();
      await flushEffects();
      expect(document.documentElement.dataset.theme).toBe("dark");
      unmount();
    });

    it("persists theme to localStorage on mount", async () => {
      matchMediaMock.matches = true;
      const { unmount } = renderUseTheme();
      await flushEffects();
      expect(localStorage.getItem(THEME_KEY)).toBe("dark");
      unmount();
    });
  });
});
