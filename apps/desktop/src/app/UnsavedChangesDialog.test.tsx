import { render, within, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

describe("UnsavedChangesDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderDialog(notes: string[], overrides = {}) {
    const onAction = vi.fn().mockResolvedValue(true);
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const result = render(
      <UnsavedChangesDialog
        noteNames={notes}
        onAction={onAction}
        onComplete={onComplete}
        onCancel={onCancel}
        {...overrides}
      />
    );
    return { ...result, onAction, onComplete, onCancel };
  }

  it("renders alert dialog with note names", () => {
    const { container } = renderDialog(["note1.md", "note2.md"]);

    const dialog = within(container).getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(container).getByText("note1.md")).toBeInTheDocument();
    expect(within(container).getByText("note2.md")).toBeInTheDocument();
    expect(within(container).getByText("Unsaved drafts")).toBeInTheDocument();
  });

  it("individual action removes note and calls onComplete when list empties", async () => {
    const { container, onAction, onComplete } = renderDialog(["note1.md"]);

    const saveButton = within(container).getByRole("button", { name: /^Save$/i });
    await act(async () => {
      saveButton.click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("individual action keeps note when list not empty", async () => {
    const { container, onAction, onComplete } = renderDialog(["note1.md", "note2.md"]);

    const saveButtons = within(container).getAllByRole("button", { name: /^Save$/i });
    await act(async () => {
      saveButtons[0].click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(onComplete).not.toHaveBeenCalled();
    expect(within(container).getByText("note2.md")).toBeInTheDocument();
  });

  it("failed action displays error and keeps note", async () => {
    const onAction = vi.fn().mockResolvedValue(false);
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <UnsavedChangesDialog
        noteNames={["note1.md"]}
        onAction={onAction}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    );

    const saveButton = within(container).getByRole("button", { name: /^Save$/i });
    await act(async () => {
      saveButton.click();
      await vi.runAllTimersAsync();
    });

    expect(onAction).toHaveBeenCalledWith("note1.md", "save");
    expect(onComplete).not.toHaveBeenCalled();
    expect(within(container).getByRole("alert")).toHaveTextContent(
      'Could not save \u201Cnote1.md\u201D. It remains in the list.'
    );
    expect(within(container).getByText("note1.md")).toBeInTheDocument();
  });

  it("Escape key calls onCancel", async () => {
    const { container, onCancel } = renderDialog(["note1.md"]);

    const dialog = within(container).getByRole("alertdialog");
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});