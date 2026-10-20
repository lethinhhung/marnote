import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";

describe("useAutosave saveNow", () => {
  it("saves immediately and cancels the pending debounce", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useAutosave({
      path: "note.md", draft: "changed", noteContent: "original", save,
    }));
    await act(async () => { await result.current.saveNow(); });
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("note.md", "changed", "original");
    vi.useRealTimers();
  });
});
