import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function CodeBlockView({ node }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return <NodeViewWrapper className="code-block-shell">
    <button className="code-block-copy" type="button" title="Copy code" aria-label="Copy code" onMouseDown={event => event.preventDefault()} onClick={() => void copy()}>
      {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}
    </button>
    <pre><NodeViewContent<"code"> as="code" /></pre>
  </NodeViewWrapper>;
}
