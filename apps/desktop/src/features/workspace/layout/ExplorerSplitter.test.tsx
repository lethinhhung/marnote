import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExplorerSplitter } from "./ExplorerSplitter";

const mockProps = {
  width: 260,
  collapsed: false,
  onResize: vi.fn(),
  onToggle: vi.fn(),
};

function renderSplitter(overrides: Partial<typeof mockProps> = {}) {
  const props = { ...mockProps, ...overrides };
  vi.clearAllMocks();
  return render(<ExplorerSplitter {...props} />);
}

function getSplitter() {
  return screen.getByRole("separator", { name: /Resize Explorer/i });
}

function getCollapsedButton() {
  return screen.getByRole("button", { name: /Expand Explorer/i });
}

function setupDOM(appWidth = 1200) {
  document.body.innerHTML = `
    <div class="app-layout" style="width: ${appWidth}px;">
      <div class="explorer-dock" style="width: 260px;">
        <div id="workspace-explorer" style="width: 260px;"></div>
      </div>
    </div>
  `;
  Object.defineProperty(window, "innerWidth", { value: appWidth, configurable: true });
  const appLayout = document.querySelector(".app-layout") as HTMLElement;
  Object.defineProperty(appLayout, "clientWidth", { value: appWidth, configurable: true });
}

describe("ExplorerSplitter", () => {
  beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("width clamping", () => {
    it("clamps width to min when resize called with value below min", () => {
      renderSplitter({ width: 150 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "ArrowLeft", shiftKey: false });
      });

      expect(onResize).toHaveBeenCalledWith(200);
    });

    it("clamps width to max when resize called with value above max", () => {
      renderSplitter({ width: 400 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "End" });
      });

      expect(onResize).toHaveBeenCalledWith(420);
    });

    it("clamps on window resize", () => {
      renderSplitter({ width: 500 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(onResize).toHaveBeenCalledWith(420);
    });

    it("adjusts max based on available width", () => {
      setupDOM(600);

      renderSplitter({ width: 300 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "End" });
      });

      expect(onResize).toHaveBeenCalledWith(216);
    });
  });

  describe("collapsed-state toggling", () => {
    it("renders collapsed button when collapsed", () => {
      renderSplitter({ collapsed: true });
      expect(getCollapsedButton()).toBeInTheDocument();
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    });

    it("calls onToggle when collapsed button clicked", () => {
      renderSplitter({ collapsed: true });
      act(() => {
        fireEvent.click(getCollapsedButton());
      });
      expect(mockProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onToggle when Enter pressed on separator", () => {
      renderSplitter({ collapsed: false });
      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "Enter" });
      });
      expect(mockProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it("collapses when Home pressed on separator", () => {
      renderSplitter({ collapsed: false });
      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "Home" });
      });
      expect(mockProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it("does not toggle when Home pressed while already collapsed", () => {
      renderSplitter({ collapsed: true });
      act(() => {
        fireEvent.keyDown(getCollapsedButton(), { key: "Home" });
      });
      expect(mockProps.onToggle).not.toHaveBeenCalled();
    });

    it("expands to max when End pressed", () => {
      renderSplitter({ width: 260, collapsed: false });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "End" });
      });

      expect(onResize).toHaveBeenCalledWith(420);
      expect(mockProps.onToggle).not.toHaveBeenCalled();
    });
  });

  describe("separator keyboard controls", () => {
    it("resizes right with ArrowRight", () => {
      renderSplitter({ width: 260 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "ArrowRight" });
      });

      expect(onResize).toHaveBeenCalledWith(270);
    });

    it("resizes left with ArrowLeft", () => {
      renderSplitter({ width: 260 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "ArrowLeft" });
      });

      expect(onResize).toHaveBeenCalledWith(250);
    });

    it("uses larger step with Shift+ArrowRight", () => {
      renderSplitter({ width: 260 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "ArrowRight", shiftKey: true });
      });

      expect(onResize).toHaveBeenCalledWith(300);
    });

    it("uses larger step with Shift+ArrowLeft", () => {
      renderSplitter({ width: 260 });
      const { onResize } = mockProps;
      onResize.mockClear();

      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "ArrowLeft", shiftKey: true });
      });

      expect(onResize).toHaveBeenCalledWith(220);
    });

    it("toggles when Enter pressed on separator", () => {
      renderSplitter({ collapsed: false });
      act(() => {
        fireEvent.keyDown(getSplitter(), { key: "Enter" });
      });
      expect(mockProps.onToggle).toHaveBeenCalledTimes(1);
    });

    
  });

  describe("accessibility attributes", () => {
    it("sets correct aria attributes on separator", () => {
      renderSplitter({ width: 260 });
      const splitter = getSplitter();

      expect(splitter).toHaveAttribute("aria-orientation", "vertical");
      expect(splitter).toHaveAttribute("aria-controls", "workspace-explorer");
      expect(splitter).toHaveAttribute("aria-valuenow", "260");
      expect(splitter).toHaveAttribute("aria-valuemin", "200");
      expect(splitter).toHaveAttribute("aria-valuemax", "420");
      expect(splitter).toHaveAttribute("tabIndex", "0");
    });

    it("sets correct aria attributes on collapsed button", () => {
      renderSplitter({ collapsed: true });
      const button = getCollapsedButton();

      expect(button).toHaveAttribute("aria-label", "Expand Explorer");
      expect(button).toHaveAttribute("aria-controls", "workspace-explorer");
      expect(button).toHaveAttribute("type", "button");
    });
  });
});