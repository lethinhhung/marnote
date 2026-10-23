import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TagPicker } from "./TagPicker";

function renderTagPicker(selected: string[] = []) {
  const onChange = vi.fn();
  const onColor = vi.fn();
  const onEdit = vi.fn();
  render(
    <TagPicker
      selected={selected}
      tags={{ work: "#123456", urgent: "#abcdef" }}
      usageCounts={{ work: 3, urgent: 1 }}
      onChange={onChange}
      onColor={onColor}
      onEdit={onEdit}
    />,
  );
  return { onChange, onColor, onEdit };
}

function openPicker() {
  // The trigger button's label changes based on selection
  const trigger = screen.getByRole("button", { name: /add tag|edit tags/i });
  fireEvent.click(trigger);
  return trigger;
}

describe("TagPicker", () => {
  it("opens the tag picker and shows saved tags in its portal", () => {
    renderTagPicker();

    const trigger = screen.getByRole("button", { name: "Add tag" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "work" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "urgent" })).toBeInTheDocument();
  });

  it("adds a saved tag to the selection", () => {
    const { onChange } = renderTagPicker();
    openPicker();

    fireEvent.click(screen.getByRole("checkbox", { name: "work" }));

    expect(onChange).toHaveBeenCalledWith(["work"]);
  });

  it("removes a tag from the selection when unchecked", () => {
    const { onChange } = renderTagPicker(["work", "urgent"]);
    openPicker();

    fireEvent.click(screen.getByRole("checkbox", { name: "work" }));

    expect(onChange).toHaveBeenCalledWith(["urgent"]);
  });

  it("creates a new tag from the picker", () => {
    const { onChange } = renderTagPicker();
    openPicker();

    const input = screen.getByPlaceholderText("Create a tag");
    fireEvent.change(input, { target: { value: "new-tag" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["new-tag"]);
  });

  it("opens the tag management dialog", () => {
    renderTagPicker();
    openPicker();

    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    expect(screen.getByRole("dialog", { name: "Manage tags" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tag name work" })).toHaveValue("#work");
    expect(screen.getByLabelText("Used on 3 items")).toBeInTheDocument();
  });

  it("edits a tag name in the manager", () => {
    const { onEdit } = renderTagPicker();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    const nameInput = screen.getByRole("textbox", { name: "Tag name work" });
    fireEvent.change(nameInput, { target: { value: "#renamed" } });
    fireEvent.blur(nameInput);

    expect(onEdit).toHaveBeenCalledWith("work", "renamed", "#123456");
  });

  it("changes tag color in the manager", () => {
    const { onColor } = renderTagPicker();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    const colorInput = screen.getByLabelText("Change work color");
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });

    expect(onColor).toHaveBeenCalledWith("work", "#ff0000");
  });

  it("removes a tag in the manager", () => {
    const { onColor } = renderTagPicker();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove work" }));

    expect(onColor).toHaveBeenCalledWith("work", "");
  });

  it("creates a new tag in the manager", () => {
    const { onColor } = renderTagPicker();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    const input = screen.getByPlaceholderText("New tag name");
    fireEvent.change(input, { target: { value: "manager-tag" } });
    fireEvent.click(screen.getByRole("button", { name: "Create tag" }));

    expect(onColor).toHaveBeenCalledWith("manager-tag", "#74856b");
  });

  it("closes on Escape key", () => {
    renderTagPicker();
    openPicker();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Manage tags" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add tag/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes picker on outside click", () => {
    renderTagPicker();
    openPicker();

    fireEvent.pointerDown(document.documentElement);

    const triggers = screen.getAllByRole("button", { name: /add tag/i });
    const trigger = triggers.find(t => t.className.includes("tag-picker-trigger"));
    expect(trigger).toBeDefined();
    expect(trigger!).toHaveAttribute("aria-expanded", "false");
  });

  it("closes manager on backdrop click", () => {
    renderTagPicker();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Manage tags" }));

    const backdrop = screen.getByRole("dialog", { name: "Manage tags" }).parentElement!;
    fireEvent.mouseDown(backdrop);

    expect(screen.queryByRole("dialog", { name: "Manage tags" })).not.toBeInTheDocument();
  });

  it("shows empty state when no tags exist", () => {
    const onChange = vi.fn();
    const onColor = vi.fn();
    const onEdit = vi.fn();
    render(
      <TagPicker
        selected={[]}
        tags={{}}
        usageCounts={{}}
        onChange={onChange}
        onColor={onColor}
        onEdit={onEdit}
      />,
    );

    openPicker();

    expect(screen.getByText("Create a tag to reuse it on notes and folders.")).toBeInTheDocument();
  });
});