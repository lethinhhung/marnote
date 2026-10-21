export type WorkspaceFile = {
  path: string;
  kind?: "file" | "directory";
};

export type WorkspaceEntryMetadata = {
  tags?: string[];
  icon?: string;
  favorite?: boolean;
  createdMs?: number;
  updatedMs?: number;
};

export type WorkspaceNode = {
  name: string;
  path: string;
  kind: "file" | "directory";
  metadata?: WorkspaceEntryMetadata;
  children: WorkspaceNode[];
};

/** Normalize a workspace-relative path; reject absolute paths and traversal. */
export function normalizeWorkspacePath(input: string): string | null {
  const value = input.replace(/\\/g, "/");
  if (value.startsWith("/") || /^[a-zA-Z]:\//.test(value)) return null;
  const parts: string[] = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}

/** Build a stable nested tree, adding implicit parent directories as needed. */
export function buildWorkspaceTree(files: WorkspaceFile[]): WorkspaceNode[] {
  const root: WorkspaceNode = { name: "", path: "", kind: "directory", children: [] };
  for (const item of files) {
    const path = normalizeWorkspacePath(item.path);
    if (!path) continue;
    const parts = path.split("/");
    let children = root.children;
    let current = root;
    parts.forEach((name, index) => {
      const targetKind = index === parts.length - 1 ? (item.kind ?? "file") : "directory";
      let node = children.find((child) => child.name === name);
      if (!node) {
        node = { name, path: parts.slice(0, index + 1).join("/"), kind: targetKind, children: [] };
        children.push(node);
      } else if (targetKind === "directory") node.kind = "directory";
      current = node;
      children = current.children;
    });
  }
  const sort = (nodes: WorkspaceNode[]) => {
    nodes.sort((a, b) => Number(b.kind === "directory") - Number(a.kind === "directory") || a.name.localeCompare(b.name));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

/** Show Markdown files plus everything under conventional docs/specs folders. */
export function isDocumentationPath(path: string): boolean {
  const normalized = normalizeWorkspacePath(path)?.toLowerCase();
  return !!normalized && (/\.md$/.test(normalized) || /^(docs|specs)\//.test(normalized));
}
