import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";

type Props = { draft: string; noteContent: string };

function renderAutosave(initial: Props) {
  const save = vi.fn().mockResolvedValue(true);
  const view = renderHook(
    ({ draft, noteContent }: Props) =>
      useAutosave({
        path: "note.md",
        draft,
        noteContent,
        save: (path, content, expected) => save(path, content, expected),
      }),
    { initialProps: initial },
  );
  return { ...view, save };
}

describe("useAutosave with a changing save callback", () => {
  it("settles on saved after a debounced save when save identity changes per render", async () => {
    vi.useFakeTimers();
    let resolveSave: (value: boolean) => void = () => {};
    const save = vi.fn().mockImplementation(() => new Promise<boolean>(resolve => { resolveSave = resolve; }));
    const { result, rerender } = renderHook(
      ({ draft, noteContent }: Props) =>
        useAutosave({
          path: "note.md",
          draft,
          noteContent,
          save: (path, content, expected) => save(path, content, expected),
        }),
      { initialProps: { draft: "original", noteContent: "original" } },
    );

    rerender({ draft: "changed", noteContent: "original" });
    await act(async () => { vi.advanceTimersByTime(650); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saving");

    await act(async () => { resolveSave(true); await Promise.resolve(); });
    expect(result.current.status).toBe("saved");

    vi.useRealTimers();
  });

  it("keeps the debounce deadline when an unrelated render occurs", async () => {
    vi.useFakeTimers();
    const { save, rerender } = renderAutosave({ draft: "original", noteContent: "original" });

    rerender({ draft: "changed", noteContent: "original" });
    await act(async () => { vi.advanceTimersByTime(300); });
    rerender({ draft: "changed", noteContent: "original" });

    await act(async () => { vi.advanceTimersByTime(350); });
    expect(save).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
