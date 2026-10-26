import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { useWideContent } from "./useWideContent";

const STORAGE_KEY = "marnote-horizontal-scroll";

function renderUseWideContent() {
  let result: ReturnType<typeof useWideContent> | null = null;
  function TestComponent() {
    result = useWideContent();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<TestComponent />));
  return {
    getResult: () => result!,
    unmount: () => { act(() => root.unmount()); container.remove(); },
  };
}

describe("useWideContent", () => {
  beforeEach(() => localStorage.clear());

  it("loads the saved horizontal scroll preference", () => {
    localStorage.setItem(STORAGE_KEY, "false");
    const { getResult, unmount } = renderUseWideContent();
    expect(getResult().horizontalScroll).toBe(false);
    unmount();
  });

  it("defaults to enabled without a saved preference", () => {
    const { getResult, unmount } = renderUseWideContent();
    expect(getResult().horizontalScroll).toBe(true);
    unmount();
  });

  it("persists the changed preference", () => {
    const { getResult, unmount } = renderUseWideContent();
    act(() => getResult().toggleHorizontalScroll());
    expect(getResult().horizontalScroll).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
    unmount();
  });
});
