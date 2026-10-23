import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTagEdit, tagEditEventName } from "./tagEditRequest";

describe("requestTagEdit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches the tag edit event with the tag string as detail", () => {
    const listener = vi.fn();
    window.addEventListener(tagEditEventName(), listener);

    try {
      requestTagEdit("work/project");
    } finally {
      window.removeEventListener(tagEditEventName(), listener);
    }

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent<string>;
    expect(event.type).toBe(tagEditEventName());
    expect(event.detail).toBe("work/project");
  });
});
