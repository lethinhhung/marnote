const workspace = {
  name: "Marnote Demo",
  path: "/demo",
  tags: { planning: "#526b58", research: "#7187a5" },
  entries: [
    { name: "Projects", path: "Projects", kind: "directory", children: [
      { name: "Roadmap.md", path: "Projects/Roadmap.md", kind: "file",
        metadata: { tags: ["planning"], favorite: true } },
    ] },
    { name: "Welcome.md", path: "Welcome.md", kind: "file" },
    { name: "Research.md", path: "Research.md", kind: "file",
      metadata: { tags: ["research"] } },
  ],
};
const contents = {
  "Welcome.md": "# Welcome to Marnote\n\nA calm place for notes that stay in your workspace.\n\n## Start here\n\n- Capture a thought\n- Organize it in a folder\n- Find it later with search\n",
  "Research.md": "# Research\n\nA few ideas to explore.\n\n| Topic | Next step |\n| --- | --- |\n| Search | Test a focused workflow |\n| Writing | Keep notes easy to scan |\n",
  "Projects/Roadmap.md": "# Roadmap\n\n## This week\n\n- Improve the writing flow\n- Review workspace navigation\n",
};

window.isTauri = false;
window.__TAURI_INTERNALS__ = {
  invoke: async (command, args = {}) => {
    if (["default_workspace", "open_workspace", "list_workspace_tree"].includes(command)) return workspace;
    if (command === "file_read_markdown") {
      return { path: args.path, content: contents[args.path] ?? "", modifiedMs: Date.now() };
    }
    if (command === "file_list_trash") return [];
    if (command === "file_update_markdown") {
      contents[args.path] = args.content;
      return undefined;
    }
    if (command === "file_create_markdown") {
      contents[args.path] = args.content ?? "";
      return args.path;
    }
    if (/^(file_|folder_|save_|update_|rename_)/.test(command)) return undefined;
    throw new Error(`Unmocked Tauri command: ${command}`);
  },
};
