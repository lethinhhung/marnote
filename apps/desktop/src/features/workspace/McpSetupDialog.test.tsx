import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpSetupDialog } from "./McpSetupDialog";

describe("McpSetupDialog", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("offers prompt and manual setup for this workspace", () => {
    render(<McpSetupDialog workspacePath="/Users/me/Notes" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Connect an AI app" })).toBeInTheDocument();
    const manualSetup = screen.getByRole("region", { name: "Manual setup" });
    expect(within(manualSetup).getByText("/Users/me/Notes")).toBeInTheDocument();
    expect(within(manualSetup).getByRole("button", { name: "Copy path for manual setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open manual setup guide" })).toBeInTheDocument();
    expect(screen.getByText("Paste it into your AI assistant to set up this connection.")).toBeInTheDocument();
    expect(screen.getAllByText("list_workspace")).toHaveLength(2);
    expect(screen.getAllByText("read_note")).toHaveLength(2);
    expect(screen.getAllByText("search_notes")).toHaveLength(2);
  });

  it("copies the workspace path from the manual setup section", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<McpSetupDialog workspacePath="/workspace/notes" onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copy path for manual setup" }));
    expect(writeText).toHaveBeenCalledWith("/workspace/notes");
    expect(screen.getByRole("button", { name: "Copy path for manual setup" })).toHaveTextContent("Copied");
  });

  it("copies a setup prompt with the active workspace and guide", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<McpSetupDialog workspacePath="/workspace/notes" onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));
    const prompt = writeText.mock.calls[0][0] as string;
    expect(prompt).toContain("/workspace/notes");
    expect(prompt).toContain("https://github.com/lethinhhung/marnote/blob/main/docs/mcp.md");
    expect(prompt).toContain("read-only tools: list_workspace, read_note, and search_notes");
    expect(prompt).toContain("Do not claim the setup is complete");
    expect(screen.getByRole("button", { name: "Copy prompt" })).toHaveTextContent("Prompt copied");
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
    await user.click(screen.getByRole("link", { name: "Open manual setup guide" }));
    expect(browserOpen).toHaveBeenCalledWith("https://github.com/lethinhhung/marnote/blob/main/docs/mcp.md", "_blank", "noopener,noreferrer");
  });

  it("keeps keyboard focus inside the modal", async () => {
    const user = userEvent.setup();
    render(<McpSetupDialog workspacePath="/workspace" onClose={vi.fn()} />);
    await user.tab({ shift: true });
    expect(screen.getByRole("link", { name: "Open manual setup guide" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});
