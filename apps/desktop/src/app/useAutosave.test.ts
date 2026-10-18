import { act, renderHook } from "@testing-library/react";
import { useAutosave } from "./useAutosave";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not start save before 650ms debounce", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const onStatusChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "initial content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "initial content" } }
    );

    expect(result.current.status).toBe("saved");
    expect(onStatusChange).toHaveBeenCalledWith("saved");

    // Change draft to trigger debounce
    rerender({ draft: "modified content" });

    // Advance timers by less than debounce
    await act(async () => {
      vi.advanceTimersByTime(649);
    });

    expect(save).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith("saving");
  });

  it("starts save after 650ms debounce", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const onStatusChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "original content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "original content" } }
    );

    expect(result.current.status).toBe("saved");

    // Change draft
    rerender({ draft: "modified content" });

    // Advance timers by less than debounce - save should not start
    await act(async () => {
      vi.advanceTimersByTime(649);
    });

    expect(save).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith("saving");

    // Advance timers past debounce - save should start
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("saving");

    // Wait for save to complete
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onStatusChange).toHaveBeenCalledWith("saved");
  });

  it("cancels earlier pending save when newer draft changes", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const onStatusChange = vi.fn();

    const { rerender } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "original content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "original content" } }
    );

    // First draft change
    rerender({ draft: "first change" });

    // Advance past debounce for first change
    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("saving");

    // Second draft change before first save completes
    rerender({ draft: "second change" });

    // Advance timers - first save's promise should still resolve but be ignored
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Save should have been called again for second change
    expect(save).toHaveBeenCalledTimes(2);

    // The final status should be from the second save
    expect(onStatusChange).toHaveBeenCalledWith("saved");
  });

  it("stale save completion does not overwrite status from newer save", async () => {
    let firstSaveResolve: (value: boolean) => void;
    let secondSaveResolve: (value: boolean) => void;

    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            firstSaveResolve = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            secondSaveResolve = resolve;
          })
      );

    const onStatusChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "original content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "original content" } }
    );

    // First draft change
    rerender({ draft: "first change" });

    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("saving");

    // Second draft change before first save resolves
    rerender({ draft: "second change" });

    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    expect(save).toHaveBeenCalledTimes(2);
    // Second save starts
    expect(onStatusChange).toHaveBeenLastCalledWith("saving");

    // Resolve second save first (success)
    await act(async () => {
      secondSaveResolve!(true);
      await vi.runAllTimersAsync();
    });

    expect(onStatusChange).toHaveBeenCalledWith("saved");

    // Now resolve first save (stale) - should not overwrite status
    await act(async () => {
      firstSaveResolve!(false); // This would be error if not ignored
      await vi.runAllTimersAsync();
    });

    // Status should still be "saved" from second save, not "error" from first
    expect(onStatusChange).toHaveBeenLastCalledWith("saved");
    expect(result.current.status).toBe("saved");
  });

  it("resets status to saved when path changes", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const onStatusChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ path, draft }) =>
        useAutosave({
          path,
          draft,
          noteContent: "original content",
          save,
          onStatusChange,
        }),
      { initialProps: { path: "/test/note1.md", draft: "original content" } }
    );

    expect(result.current.status).toBe("saved");

    // Change path
    rerender({ path: "/test/note2.md", draft: "original content" });

    expect(result.current.status).toBe("saved");
    expect(onStatusChange).toHaveBeenCalledWith("saved");
  });

  it("does not save when draft equals note content", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const onStatusChange = vi.fn();

    const { result } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "same content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "same content" } }
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("saved");
    expect(save).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith("saving");
  });

  it("sets error status when save fails", async () => {
    const save = vi.fn().mockResolvedValue(false);
    const onStatusChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ draft }) =>
        useAutosave({
          path: "/test/note.md",
          draft,
          noteContent: "original content",
          save,
          onStatusChange,
        }),
      { initialProps: { draft: "original content" } }
    );

    rerender({ draft: "modified content" });

    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onStatusChange).toHaveBeenCalledWith("saving");
    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(result.current.status).toBe("error");
  });
});