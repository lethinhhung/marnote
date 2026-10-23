import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTree } from "../domain/workspace";
import { HeaderBar } from "./HeaderBar";

vi.mock("./SearchPalette", () => ({
  SearchPalette: () => <div data-testid="search-palette-stub" />,
}));

function renderHeader() {
  const onToggleExplorer = vi.fn();
  const tree: WorkspaceTree = { name: "Notes", path: "/notes", entries: [] };
  render(
    <HeaderBar
      tree={tree}
      path="Projects/Plan.md"
      content="# Plan"
      theme="light"
      source={false}
      explorerCollapsed={false}
      toggleTheme={vi.fn()}
      onToggleExplorer={onToggleExplorer}
      onToggleSource={vi.fn()}
      onSelect={vi.fn()}
      onCreate={vi.fn()}
      onCapture={vi.fn()}
      onCopy={vi.fn()}
      onQuickAction={vi.fn()}
    />,
  );
  return { onToggleExplorer };
}

describe("HeaderBar", () => {
  it("exposes key header controls and current note location", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Use compact Explorer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy note as Markdown" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Toggle Markdown source view" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).toHaveTextContent("Plan.md");
  });

  it("calls the explorer toggle when its accessible control is activated", () => {
    const { onToggleExplorer } = renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Use compact Explorer" }));

    expect(onToggleExplorer).toHaveBeenCalledOnce();
  });

  it("opens the search entry point without mounting the real palette", () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Search workspace" }));

    expect(screen.getByTestId("search-palette-stub")).toBeInTheDocument();
  });
});
