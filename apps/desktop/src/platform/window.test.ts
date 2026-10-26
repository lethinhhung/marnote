import { beforeEach, describe, expect, it, vi } from "vitest";

const { isTauri, startDragging, getCurrentWindow } = vi.hoisted(() => {
  const startDragging = vi.fn();
  const getCurrentWindow = vi.fn(() => ({ startDragging }));
  return { isTauri: vi.fn(), startDragging, getCurrentWindow };
});

vi.mock("@tauri-apps/api/core", () => ({ isTauri }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow }));

import { windowDragAvailable, startWindowDrag } from "./window";

describe("windowDragAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when Tauri is available", () => {
    isTauri.mockReturnValue(true);
    expect(windowDragAvailable()).toBe(true);
  });

  it("returns false when Tauri is not available", () => {
    isTauri.mockReturnValue(false);
    expect(windowDragAvailable()).toBe(false);
  });
});

describe("startWindowDrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauri.mockReturnValue(false);
  });

  it("does nothing when Tauri is not available", () => {
    startWindowDrag();
    expect(getCurrentWindow).not.toHaveBeenCalled();
    expect(startDragging).not.toHaveBeenCalled();
  });

  it("starts dragging when Tauri is available", () => {
    isTauri.mockReturnValue(true);
    startDragging.mockResolvedValue(undefined);

    startWindowDrag();

    expect(getCurrentWindow).toHaveBeenCalledOnce();
    expect(startDragging).toHaveBeenCalledOnce();
  });

  it("swallows errors from startDragging", () => {
    isTauri.mockReturnValue(true);
    startDragging.mockRejectedValue(new Error("drag failed"));

    expect(() => startWindowDrag()).not.toThrow();

    expect(getCurrentWindow).toHaveBeenCalledOnce();
    expect(startDragging).toHaveBeenCalledOnce();
  });
});