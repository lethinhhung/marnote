import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NoNoteOpened } from "./NoNoteOpened";

describe("NoNoteOpened", () => {
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dispatchEventSpy = vi.spyOn(document, "dispatchEvent") as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  describe("when canCreate is false", () => {
    it("renders the workspace prompt without a create button", () => {
      render(<NoNoteOpened canCreate={false} />);

      expect(screen.getByText("Open a workspace")).toBeInTheDocument();
      expect(screen.getByText("Open a local folder to browse its Markdown files.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Create a note/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Nothing open yet")).not.toBeInTheDocument();
    });
  });

  describe("when canCreate is true", () => {
    it("renders the empty-note state with create button", () => {
      render(<NoNoteOpened canCreate={true} />);

      expect(screen.getByText("Nothing open yet")).toBeInTheDocument();
      expect(screen.getByText("Choose a note from your workspace, or start with a fresh page.")).toBeInTheDocument();
      expect(screen.getByText("Your notes stay in this workspace as Markdown files.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create a note/i })).toBeInTheDocument();
      expect(screen.queryByText("Open a workspace")).not.toBeInTheDocument();
    });

    it("dispatches marnote-create-note event when create button is clicked", () => {
      render(<NoNoteOpened canCreate={true} />);

      const createButton = screen.getByRole("button", { name: /Create a note/i });
      fireEvent.click(createButton);

      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.type).toBe("marnote-create-note");
    });
  });
});