import { act, render, renderHook, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesPrompt } from "./useUnsavedChangesPrompt";

describe("useUnsavedChangesPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getSaveButtons(container: HTMLElement) {
    return within(container).getAllByRole("button", { name: /^Save$/i });
  }

  function getDiscardButtons(container: HTMLElement) {
    return within(container).getAllByRole("button", { name: /^Discard$/i });
  }

  function getSaveAllButton(container: HTMLElement) {
    return within(container).getByRole("button", { name: /Save all/i });
  }

  function getDiscardAllButton(container: HTMLElement) {
    return within(container).getByRole("button", { name: /Discard all/i });
  }

  function getCancelButton(container: HTMLElement) {
    return within(container).getByRole("button", { name: /Cancel/i });
  }

  function getDialog(container: HTMLElement) {
    return within(container).getByRole("alertdialog");
  }

  it("ask returns a promise resolved when Save all is clicked and all saves succeed", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let askPromise: Promise<boolean>;
    act(() => {
      askPromise = result.current.ask(["note1.md", "note2.md"], onAction);
    });

    expect(result.current.dialog).not.toBeNull();

    const { container } = render(result.current.dialog!);
    const saveAllButton = getSaveAllButton(container);
    await act(async () => {
      saveAllButton.click();
      await vi.runAllTimersAsync();
    });

    await expect(askPromise!).resolves.toBe(true);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(onAction).toHaveBeenCalledWith("note2.md", "save");
    expect(result.current.dialog).toBeNull();
  });

  it("ask returns a promise resolved when Discard all is clicked and all discards succeed", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let askPromise: Promise<boolean>;
    act(() => {
      askPromise = result.current.ask(["note1.md", "note2.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const discardAllButton = getDiscardAllButton(container);
    await act(async () => {
      discardAllButton.click();
      await vi.runAllTimersAsync();
    });

    await expect(askPromise!).resolves.toBe(true);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenCalledWith("note1.md", "discard");
    expect(onAction).toHaveBeenCalledWith("note2.md", "discard");
    expect(result.current.dialog).toBeNull();
  });

  it("ask returns a promise resolved to false when Cancel is clicked", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let askPromise: Promise<boolean>;
    act(() => {
      askPromise = result.current.ask(["note1.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const cancelButton = getCancelButton(container);
    await act(async () => {
      cancelButton.click();
    });

    await expect(askPromise!).resolves.toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(result.current.dialog).toBeNull();
  });

  it("individual Save button calls onAction for that note", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    act(() => {
      result.current.ask(["note1.md", "note2.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const note1SaveButton = getSaveButtons(container)[0];
    await act(async () => {
      note1SaveButton.click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(onAction).toHaveBeenCalledTimes(1);
    // Dialog still shows because note2.md remains
    expect(result.current.dialog).not.toBeNull();
  });

  it("individual Discard button calls onAction for that note", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    act(() => {
      result.current.ask(["note1.md", "note2.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const note1DiscardButton = getDiscardButtons(container)[0];
    await act(async () => {
      note1DiscardButton.click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "discard");
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(result.current.dialog).not.toBeNull();
  });

  it("dialog receives the expected note names", () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    act(() => {
      result.current.ask(["note1.md", "note2.md", "note3.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    expect(within(container).getByText("note1.md")).toBeInTheDocument();
    expect(within(container).getByText("note2.md")).toBeInTheDocument();
    expect(within(container).getByText("note3.md")).toBeInTheDocument();
  });

  it("dialog receives the onAction handler and calls it with correct arguments", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    act(() => {
      result.current.ask(["note1.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const saveButton = getSaveButtons(container)[0];
    await act(async () => {
      saveButton.click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
  });

  it("ask promise stays pending when onAction returns false (save fails)", async () => {
    const onAction = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let askPromise: Promise<boolean>;
    act(() => {
      askPromise = result.current.ask(["note1.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const saveButton = getSaveButtons(container)[0];
    await act(async () => {
      saveButton.click();
      await vi.runAllTimersAsync();
    });

    // Promise should still be pending (not resolved)
    let resolved = false;
    askPromise!.then(() => { resolved = true; });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(resolved).toBe(false);
    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(result.current.dialog).not.toBeNull();
  });

  it("Escape key closes dialog and resolves promise to false", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let askPromise: Promise<boolean>;
    act(() => {
      askPromise = result.current.ask(["note1.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const dialog = getDialog(container);
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    await expect(askPromise!).resolves.toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(result.current.dialog).toBeNull();
  });

  it("multiple sequential asks work correctly", async () => {
    const onAction = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useUnsavedChangesPrompt());

    let firstPromise: Promise<boolean>;
    act(() => {
      firstPromise = result.current.ask(["note1.md"], onAction);
    });

    const { container } = render(result.current.dialog!);
    const saveButton = getSaveButtons(container)[0];
    await act(async () => {
      saveButton.click();
      await vi.runAllTimersAsync();
    });

    await expect(firstPromise!).resolves.toBe(true);
    expect(result.current.dialog).toBeNull();

    let secondPromise: Promise<boolean>;
    act(() => {
      secondPromise = result.current.ask(["note2.md", "note3.md"], onAction);
    });

    expect(result.current.dialog).not.toBeNull();

    const { container: container2 } = render(result.current.dialog!);
    const saveAllButton = getSaveAllButton(container2);
    await act(async () => {
      saveAllButton.click();
      await vi.runAllTimersAsync();
    });

    await expect(secondPromise!).resolves.toBe(true);
    expect(onAction).toHaveBeenCalledTimes(3);
    expect(result.current.dialog).toBeNull();
  });
});