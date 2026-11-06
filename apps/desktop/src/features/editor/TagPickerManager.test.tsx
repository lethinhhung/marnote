import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { openPicker, renderTagPicker } from "./TagPicker.test-utils";

describe("TagPicker manager", () => {
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
});
