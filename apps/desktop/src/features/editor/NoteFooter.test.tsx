import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteFooter } from "./NoteFooter";

vi.mock("../../shared/ui/EmojiPicker", () => ({
  EmojiPicker: () => <span>Emoji picker</span>,
}));

vi.mock("./TagPicker", () => ({
  TagPicker: () => <span>Tag picker</span>,
}));

describe("NoteFooter", () => {
  it("renders note metadata, stats, and the current save status", () => {
    render(
      <NoteFooter
        value="hello from the footer"
        path="notes/welcome.md"
        kind="note"
        saveStatus="saved"
        saveMode="automatic"
        dirty={false}
        onSaveModeChange={vi.fn()}
        metadata={{ createdMs: 1_700_000_000_000, updatedMs: 1_700_000_000_000, tags: ["work"] }}
        updateMetadata={vi.fn()}
        tags={{ work: "#526b58" }}
      />,
    );

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("notes/welcome.md")).toBeInTheDocument();
    expect(screen.getByText("4 words")).toBeInTheDocument();
    expect(screen.getByText("21 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#work" })).toHaveAttribute("title", "Edit work");
    expect(screen.getByRole("button", { name: "Add favorite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Automatic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows unsaved status for dirty notes and changes save mode on selection", () => {
    const onSaveModeChange = vi.fn();
    render(
      <NoteFooter
        value="draft"
        path="draft.md"
        kind="note"
        saveStatus="saving"
        saveMode="manual"
        dirty
        onSaveModeChange={onSaveModeChange}
      />,
    );

    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Automatic" }));
    expect(onSaveModeChange).toHaveBeenCalledWith("automatic");
  });
});
