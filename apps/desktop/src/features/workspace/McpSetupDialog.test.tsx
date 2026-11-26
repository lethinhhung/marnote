import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpSetupDialog } from "./McpSetupDialog";

describe("McpSetupDialog", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows workspace-scoped setup steps and supported tools", () => {
    render(<McpSetupDialog workspacePath="/Users/me/Notes" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Connect an AI app" })).toBeInTheDocument();
    expect(screen.getByText("/Users/me/Notes")).toBeInTheDocument();
    expect(screen.getByText("list_workspace")).toBeInTheDocument();
    expect(screen.getByText("read_note")).toBeInTheDocument();
    expect(screen.getByText("search_notes")).toBeInTheDocument();
  });

  it("copies the active workspace path", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<McpSetupDialog workspacePath="/workspace/notes" onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copy workspace path" }));
    expect(writeText).toHaveBeenCalledWith("/workspace/notes");
    expect(screen.getByRole("button", { name: "Copy workspace path" })).toHaveTextContent("Copied");
  });

  it("closes from the close control and Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<McpSetupDialog workspacePath="/workspace" onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("opens the client setup guide in the browser", async () => {
    const browserOpen = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    render(<McpSetupDialog workspacePath="/workspace" onClose={vi.fn()} />);
    await user.click(screen.getByRole("link", { name: "Open setup guide" }));
    expect(browserOpen).toHaveBeenCalledWith("https://github.com/lethinhhung/marnote#mcp-server", "_blank", "noopener,noreferrer");
  });

  it("keeps keyboard focus inside the modal", async () => {
    const user = userEvent.setup();
    render(<McpSetupDialog workspacePath="/workspace" onClose={vi.fn()} />);
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});
