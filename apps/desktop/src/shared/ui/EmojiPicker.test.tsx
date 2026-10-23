import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmojiPicker } from "./EmojiPicker";

vi.mock("emoji-picker-react", () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (emoji: { emoji: string }) => void }) => (
    <button type="button" onClick={() => onEmojiClick({ emoji: "🎉" })}>Pick party emoji</button>
  ),
}));

describe("EmojiPicker", () => {
  it("renders an accessible trigger and opens the picker", () => {
    render(<EmojiPicker onChange={vi.fn()} label="Choose a mood" />);

    const trigger = screen.getByRole("button", { name: "Choose a mood" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Pick party emoji" })).toBeInTheDocument();
  });

  it("passes the selected emoji to onChange and closes", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick party emoji" }));

    expect(onChange).toHaveBeenCalledWith("🎉");
    expect(screen.getByRole("button", { name: "Choose emoji" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Pick party emoji" })).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", () => {
    render(<EmojiPicker onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose emoji" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("button", { name: "Choose emoji" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Pick party emoji" })).not.toBeInTheDocument();
  });

  it("closes when clicking outside the picker", () => {
    render(<><EmojiPicker onChange={vi.fn()} /><button type="button">Outside</button></>);
    fireEvent.click(screen.getByRole("button", { name: "Choose emoji" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));

    expect(screen.getByRole("button", { name: "Choose emoji" })).toHaveAttribute("aria-expanded", "false");
  });
});
