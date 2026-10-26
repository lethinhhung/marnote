import { beforeEach, describe, expect, it, vi } from "vitest";

const { isTauri, open } = vi.hoisted(() => ({ isTauri: vi.fn(), open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri }));
vi.mock("@tauri-apps/plugin-shell", () => ({ open }));

import { normalizeLinkUrl, openExternalLink } from "./linkUrl";

describe("normalizeLinkUrl", () => {
  it("trims whitespace and adds HTTPS to domain-like values", () => {
    expect(normalizeLinkUrl("  www.example.com/path?q=1  ")).toBe("https://www.example.com/path?q=1");
    expect(normalizeLinkUrl("example.co.uk")).toBe("https://example.co.uk");
  });

  it("preserves explicit schemes and relative paths", () => {
    expect(normalizeLinkUrl(" mailto:hello@example.com ")).toBe("mailto:hello@example.com");
    expect(normalizeLinkUrl("../notes/page.md#intro")).toBe("../notes/page.md#intro");
    expect(normalizeLinkUrl("/images/photo.png")).toBe("/images/photo.png");
  });

  it("does not treat plain text or localhost as a domain", () => {
    expect(normalizeLinkUrl("some words")).toBe("some words");
    expect(normalizeLinkUrl("localhost:3000/page")).toBe("localhost:3000/page");
  });
});

describe("openExternalLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauri.mockReturnValue(false);
  });

  it("opens normalized URLs in a protected browser tab", async () => {
    const browserOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    await openExternalLink(" example.com/docs ");

    expect(browserOpen).toHaveBeenCalledWith("https://example.com/docs", "_blank", "noopener,noreferrer");
    expect(open).not.toHaveBeenCalled();
    browserOpen.mockRestore();
  });

  it("uses the Tauri shell opener in the desktop app", async () => {
    isTauri.mockReturnValue(true);
    const browserOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    await openExternalLink("example.com");

    expect(open).toHaveBeenCalledWith("https://example.com");
    expect(browserOpen).not.toHaveBeenCalled();
    browserOpen.mockRestore();
  });
});
