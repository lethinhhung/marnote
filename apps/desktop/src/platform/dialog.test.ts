import { beforeEach, describe, expect, it, vi } from "vitest";

const { isTauri, open } = vi.hoisted(() => ({
  isTauri: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ isTauri }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open }));

import { isDesktop, openWorkspaceFolder } from "./dialog";

describe("dialog platform adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isDesktop", () => {
    it("returns true when isTauri returns true", () => {
      isTauri.mockReturnValue(true);
      expect(isDesktop()).toBe(true);
      expect(isTauri).toHaveBeenCalledOnce();
    });

    it("returns false when isTauri returns false", () => {
      isTauri.mockReturnValue(false);
      expect(isDesktop()).toBe(false);
      expect(isTauri).toHaveBeenCalledOnce();
    });
  });

  describe("openWorkspaceFolder", () => {
    it("calls open with directory selection options and returns the selected path", async () => {
      isTauri.mockReturnValue(true);
      open.mockResolvedValue("/Users/test/workspace");

      const result = await openWorkspaceFolder({ defaultPath: "/home", title: "Select workspace" });

      expect(open).toHaveBeenCalledOnce();
      expect(open).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
        defaultPath: "/home",
        title: "Select workspace",
      });
      expect(result).toBe("/Users/test/workspace");
    });

    it("uses default title when not provided", async () => {
      isTauri.mockReturnValue(true);
      open.mockResolvedValue("/selected/path");

      const result = await openWorkspaceFolder({});

      expect(open).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
        defaultPath: undefined,
        title: "Open workspace folder",
      });
      expect(result).toBe("/selected/path");
    });

    it("returns null when user cancels (open returns null)", async () => {
      isTauri.mockReturnValue(true);
      open.mockResolvedValue(null);

      const result = await openWorkspaceFolder({});

      expect(result).toBeNull();
    });

    it("returns null when open returns undefined", async () => {
      isTauri.mockReturnValue(true);
      open.mockResolvedValue(undefined);

      const result = await openWorkspaceFolder({});

      expect(result).toBeNull();
    });

    it("returns empty string when open returns empty string", async () => {
      isTauri.mockReturnValue(true);
      open.mockResolvedValue("");

      const result = await openWorkspaceFolder({});

      expect(result).toBe("");
    });
  });
});