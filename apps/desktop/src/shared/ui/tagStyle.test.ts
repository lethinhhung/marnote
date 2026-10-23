import { describe, expect, it } from "vitest";
import { tagStyle } from "./tagStyle";

type TagStyleResult = {
  "--tag-accent": string;
  "--tag-light-background": string;
  "--tag-light-color": string;
  "--tag-dark-background": string;
  "--tag-dark-color": string;
};

describe("tagStyle", () => {
  it("returns light and dark CSS custom properties for the accent", () => {
    expect(tagStyle("#123456")).toEqual<TagStyleResult>({
      "--tag-light-background": "color-mix(in srgb, #123456 9%, #fffdf9)",
      "--tag-light-color": "#123456",
      "--tag-dark-background": "color-mix(in srgb, #123456 18%, #252a25)",
      "--tag-dark-color": "#e2e5de",
      "--tag-accent": "#123456",
    });
  });

  it("normalizes the legacy green accent", () => {
    expect((tagStyle("#74856B") as TagStyleResult)["--tag-accent"]).toBe("#526b58");
  });

  it("uses the default accent for an invalid color", () => {
    const style = tagStyle("green") as TagStyleResult;

    expect(style["--tag-accent"]).toBe("#526b58");
    expect(style["--tag-light-background"]).toBe(
      "color-mix(in srgb, #526b58 9%, #fffdf9)",
    );
  });

  it("uses a custom surface when choosing a contrasting light text color", () => {
    expect((tagStyle("#ffffff", "#000000") as TagStyleResult)["--tag-light-color"]).toBe("#ffffff");
  });
});
