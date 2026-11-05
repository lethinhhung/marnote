import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TagPicker } from "./TagPicker";
import { openPicker, renderTagPicker } from "./TagPicker.test-utils";

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
    const { onChange, onColor } = renderTagPicker();
    openPicker();

    const input = screen.getByPlaceholderText("Create a tag");
    fireEvent.change(input, { target: { value: "new-tag" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["new-tag"]);
    expect(onColor).toHaveBeenCalledWith("new-tag", "#74856b");
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
