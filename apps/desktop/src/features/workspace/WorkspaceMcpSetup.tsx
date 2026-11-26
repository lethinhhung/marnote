import { useState } from "react";
import { Sparkles } from "lucide-react";
import { McpSetupDialog } from "./McpSetupDialog";

export function WorkspaceMcpSetup({ workspacePath }: { workspacePath?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="open-workspace" type="button" disabled={!workspacePath} onClick={() => setOpen(true)}><Sparkles size={14} /> Connect an AI app</button>
    {open && workspacePath && <McpSetupDialog workspacePath={workspacePath} onClose={() => setOpen(false)} />}
  </>;
}
