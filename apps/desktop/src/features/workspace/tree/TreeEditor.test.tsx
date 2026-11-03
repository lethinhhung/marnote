import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TreeEditor } from "./TreeEditor";

describe("TreeEditor", () => {
  it("submits the trimmed name", () => {
    const onSubmit = vi.fn();
    render(<TreeEditor kind="note" value="" depth={0} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Note name" }), {
      target: { value: "  Meeting notes  " },
    });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith("Meeting notes");
  });

  it("cancels when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(<TreeEditor kind="folder" value="New folder" depth={0} onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Folder name" }), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels when focus leaves the editor", () => {
    const onCancel = vi.fn();
    render(
      <>
        <TreeEditor kind="note" value="New note" depth={0} onSubmit={vi.fn()} onCancel={onCancel} />
        <button type="button">Outside</button>
      </>,
    );

    fireEvent.blur(screen.getByRole("textbox", { name: "Note name" }), {
      relatedTarget: screen.getByRole("button", { name: "Outside" }),
    });

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
