import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteEditor } from "./NoteEditor";

function renderEditor(overrides = {}) {
  const defaultProps = {
    value: "# A note",
    onChange: vi.fn(),
    source: false,
    horizontalScroll: false,
    onToggleHorizontalScroll: vi.fn(),
    onSave: vi.fn(),
    dirty: false,
    saving: false,
    heading: <h1>A note</h1>,
    updateMetadata: vi.fn(),
    path: "notes/a-note.md",
    entries: [],
    onNavigate: vi.fn(),
    ...overrides,
  };
  return render(<NoteEditor {...defaultProps} />);
}

describe("NoteEditor", () => {
  it("mounts the editable note surface", () => {
    renderEditor();
    expect(screen.getByRole("textbox", { name: "Markdown note editor" })).toBeInTheDocument();
  });

  it("toggles source mode", () => {
    renderEditor({ source: true });
    expect(screen.getByText("# A note")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Markdown note editor" })).not.toBeInTheDocument();
  });

  it("shows save button enabled when dirty", () => {
    renderEditor({ dirty: true });
    expect(screen.getByRole("button", { name: "Save note" })).not.toBeDisabled();
  });

  it("disables save button when not dirty", () => {
    renderEditor({ dirty: false });
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
  });

  it("renders note metadata tags", () => {
    renderEditor({
      metadata: { tags: ["work", "urgent"] },
      tagColors: { work: "#123", urgent: "#456" },
    });
    expect(screen.getByRole("button", { name: "#work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#urgent" })).toBeInTheDocument();
  });

  it("renders emoji picker for note icon", () => {
    renderEditor({ metadata: { icon: "📝" } });
    expect(screen.getByRole("button", { name: "Change note icon" })).toBeInTheDocument();
  });

  it("renders heading", () => {
    renderEditor({ heading: <h1>My Note</h1> });
    expect(screen.getByRole("heading", { name: "My Note" })).toBeInTheDocument();
  });

  it("renders toolbar with formatting actions", () => {
    renderEditor();
    const boldButtons = screen.getAllByRole("button", { name: "Bold" });
    expect(boldButtons.length).toBeGreaterThan(0);
    const italicButtons = screen.getAllByRole("button", { name: "Italic" });
    expect(italicButtons.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Insert table" })).toBeInTheDocument();
  });

  it("renders link and workspace link actions in toolbar", () => {
    renderEditor();
    const linkButtons = screen.getAllByRole("button", { name: "Add web address link" });
    expect(linkButtons.length).toBeGreaterThan(0);
    const workspaceLinkButtons = screen.getAllByRole("button", { name: "Link to a note or folder" });
    expect(workspaceLinkButtons.length).toBeGreaterThan(0);
  });

  it("renders slash menu trigger in editor", () => {
    renderEditor();
    expect(screen.getByRole("textbox", { name: "Markdown note editor" })).toBeInTheDocument();
  });
});