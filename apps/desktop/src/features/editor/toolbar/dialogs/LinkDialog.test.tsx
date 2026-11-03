import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinkDialog } from "./LinkDialog";

describe("LinkDialog", () => {
  it("submits trimmed link text and a normalized web address", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="  Read more  " initialHref="  example.com/docs  " onCancel={vi.fn()} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));

    expect(onApply).toHaveBeenCalledWith("Read more", "https://example.com/docs");
  });

  it("keeps Apply disabled for invalid input", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="Reference" initialHref="some words" onCancel={vi.fn()} onApply={onApply} />);

    const applyButton = screen.getByRole("button", { name: "Apply link" });
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);

    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes on Escape key", () => {
    const onCancel = vi.fn();
    render(<LinkDialog initialText="text" initialHref="https://example.com" onCancel={onCancel} onApply={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link text" }), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("closes on blur outside dialog", () => {
    const onDismiss = vi.fn();
    render(<LinkDialog initialText="text" initialHref="https://example.com" onCancel={vi.fn()} onDismiss={onDismiss} onApply={vi.fn()} />);

    fireEvent.blur(screen.getByRole("textbox", { name: "Link text" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not close on blur within dialog", () => {
    const onDismiss = vi.fn();
    render(<LinkDialog initialText="text" initialHref="https://example.com" onCancel={vi.fn()} onDismiss={onDismiss} onApply={vi.fn()} />);

    const textInput = screen.getByRole("textbox", { name: "Link text" });
    const urlInput = screen.getByRole("textbox", { name: "Web address" });
    fireEvent.focus(textInput);
    fireEvent.focus(urlInput);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("moves focus to URL input on ArrowDown from text input", () => {
    render(<LinkDialog initialText="text" initialHref="https://example.com" onCancel={vi.fn()} onApply={vi.fn()} />);

    const textInput = screen.getByRole("textbox", { name: "Link text" });
    const urlInput = screen.getByRole("textbox", { name: "Web address" });

    fireEvent.keyDown(textInput, { key: "ArrowDown" });

    expect(urlInput).toHaveFocus();
  });

  it("submits on Enter from text input when URL is valid", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="text" initialHref="https://example.com" onCancel={vi.fn()} onApply={onApply} />);

    const textInput = screen.getByRole("textbox", { name: "Link text" });
    fireEvent.keyDown(textInput, { key: "Enter" });

    expect(onApply).toHaveBeenCalledWith("text", "https://example.com");
  });

  it("moves focus to URL input on Enter when URL is empty", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="text" initialHref="" onCancel={vi.fn()} onApply={onApply} />);

    const textInput = screen.getByRole("textbox", { name: "Link text" });
    const urlInput = screen.getByRole("textbox", { name: "Web address" });

    fireEvent.keyDown(textInput, { key: "Enter" });

    expect(urlInput).toHaveFocus();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("accepts mailto: scheme", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="Email" initialHref="mailto:test@example.com" onCancel={vi.fn()} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));

    expect(onApply).toHaveBeenCalledWith("Email", "mailto:test@example.com");
  });

  it("accepts tel: scheme", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="Call" initialHref="tel:+1234567890" onCancel={vi.fn()} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));

    expect(onApply).toHaveBeenCalledWith("Call", "tel:+1234567890");
  });

  it("uses URL as link text when text is empty", () => {
    const onApply = vi.fn();
    render(<LinkDialog initialText="" initialHref="https://example.com" onCancel={vi.fn()} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));

    expect(onApply).toHaveBeenCalledWith("https://example.com", "https://example.com");
  });
});