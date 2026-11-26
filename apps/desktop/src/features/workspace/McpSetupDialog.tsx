import { useState, type KeyboardEvent } from "react";
import { Check, ClipboardCopy, Copy, X } from "lucide-react";
import { openExternalLink } from "../editor/links/linkUrl";
import "./mcp-setup-dialog.css";

type Props = { workspacePath: string; onClose: () => void };

export function McpSetupDialog({ workspacePath, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const guideUrl = "https://github.com/lethinhhung/marnote/blob/develop/docs/mcp.md";
  const dialogKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  };
  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(workspacePath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  };
  const copySetupPrompt = async () => {
    const prompt = `Help me connect the Marnote MCP server to this AI client for the workspace at:\n${workspacePath}\n\nFollow the setup guide at ${guideUrl}. Configure the client to use this exact workspace path and explain any commands or configuration changes before making them. The server provides read-only tools: list_workspace, read_note, and search_notes. Do not claim the setup is complete until the client can connect.`;
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1600);
    } catch { setPromptCopied(false); }
  };
  return <div className="mcp-setup-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="mcp-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="mcp-setup-title" onKeyDown={dialogKeys}>
      <header><div><p className="mcp-setup-eyebrow">WORKSPACE CONNECTION</p><h2 id="mcp-setup-title">Connect an AI app</h2></div><button autoFocus type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></header>
      <div className="mcp-setup-content">
      <p className="mcp-setup-intro">Give an MCP-compatible app read-only access to browse, read, and search this workspace.</p>
      <section className="mcp-prompt-action" aria-label="Quick setup">
        <button type="button" onClick={() => void copySetupPrompt()} aria-label="Copy prompt">{promptCopied ? <Check size={15} /> : <ClipboardCopy size={15} />}{promptCopied ? "Prompt copied" : "Copy prompt"}</button>
        <span>Paste it into your AI assistant to set up this connection.</span>
      </section>
      <div className="mcp-setup-divider" role="separator"><span>or</span></div>
      <section className="mcp-manual-setup" aria-labelledby="mcp-manual-title">
        <h3 id="mcp-manual-title">Manual setup</h3>
        <div className="mcp-workspace-path"><span>Workspace folder</span><code title={workspacePath}>{workspacePath}</code><button type="button" onClick={() => void copyPath()} aria-label="Copy path for manual setup">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy path"}</button></div>
        <ol className="mcp-setup-steps"><li><b>Install the Marnote MCP server</b><span>Follow the setup guide for Claude Code, Codex CLI, Cursor, or OpenCode.</span></li><li><b>Add this workspace to your client</b><span>Use the copied folder path as the server’s workspace argument.</span></li><li><b>Restart or reconnect your client</b><span>It can then call <code>list_workspace</code>, <code>read_note</code>, and <code>search_notes</code>.</span></li></ol>
        <a href={guideUrl} onClick={event => { event.preventDefault(); void openExternalLink(event.currentTarget.href); }}>Open manual setup guide</a>
      </section>
      <p className="mcp-setup-tools">Read-only tools: <code>list_workspace</code>, <code>read_note</code>, and <code>search_notes</code>.</p>
      <p className="mcp-setup-note">The MCP server runs locally under your client. Marnote does not send workspace contents to a Marnote service.</p>
      </div>
    </section>
  </div>;
}
