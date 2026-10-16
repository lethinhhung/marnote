import { describe, expect, it } from "vitest";
import { getWelcomeMessage } from "./index";

describe("getWelcomeMessage", () => {
  it("returns a short introduction to Marnote", () => {
    expect(getWelcomeMessage()).toContain("notes");
  });
});
