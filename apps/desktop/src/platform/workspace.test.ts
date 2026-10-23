import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  createFile,
  createFolder,
  deleteFile,
  emptyTrash,
  listTrash,
  listWorkspace,
  moveFile,
  openDefaultWorkspace,
  openWorkspace,
  readFile,
  renameWorkspaceTag,
  restoreTrash,
  saveManualOrder,
  saveWorkspaceTags,
  updateEntryMetadata,
  writeFile,
} from "./workspace";

describe("workspace platform wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue("invoke result");
  });

  it.each([
    ["openWorkspace", openWorkspace, ["/notes"], "open_workspace", { path: "/notes" }],
    ["listWorkspace", listWorkspace, ["/notes"], "list_workspace_tree", { rootPath: "/notes" }],
    ["readFile", readFile, ["/notes", "a.md"], "file_read_markdown", { rootPath: "/notes", path: "a.md" }],
    ["writeFile", writeFile, ["/notes", "a.md", "updated", "old"], "file_update_markdown", { rootPath: "/notes", path: "a.md", content: "updated", expectedContent: "old" }],
    ["createFile", createFile, ["/notes", "new.md", "body"], "file_create_markdown", { rootPath: "/notes", path: "new.md", content: "body" }],
    ["moveFile", moveFile, ["/notes", "a.md", "b.md"], "file_move", { rootPath: "/notes", source: "a.md", destination: "b.md" }],
    ["deleteFile", deleteFile, ["/notes", "a.md"], "file_delete", { rootPath: "/notes", path: "a.md" }],
    ["listTrash", listTrash, ["/notes"], "file_list_trash", { rootPath: "/notes" }],
    ["restoreTrash", restoreTrash, ["/notes", "trash-1"], "file_restore_trash", { rootPath: "/notes", id: "trash-1" }],
    ["emptyTrash", emptyTrash, ["/notes"], "file_empty_trash", { rootPath: "/notes" }],
    ["createFolder", createFolder, ["/notes", "drafts"], "folder_create", { rootPath: "/notes", path: "drafts" }],
    ["updateEntryMetadata", updateEntryMetadata, ["/notes", "a.md", { tags: ["work"], icon: "📝", favorite: true }], "update_entry_metadata", { rootPath: "/notes", path: "a.md", tags: ["work"], icon: "📝", favorite: true }],
    ["saveWorkspaceTags", saveWorkspaceTags, ["/notes", { work: "blue" }], "save_workspace_tags", { rootPath: "/notes", tags: { work: "blue" } }],
    ["saveManualOrder", saveManualOrder, ["/notes", "folder", ["b.md", "a.md"]], "save_manual_order", { rootPath: "/notes", parent: "folder", paths: ["b.md", "a.md"] }],
    ["renameWorkspaceTag", renameWorkspaceTag, ["/notes", "old", "new", "green"], "rename_workspace_tag", { rootPath: "/notes", oldName: "old", newName: "new", color: "green" }],
  ])("%s forwards its arguments and returns invoke's result", async (_name, wrapper, args, command, payload) => {
    await expect((wrapper as (...values: unknown[]) => unknown)(...(args as unknown[]))).resolves.toBe("invoke result");
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(command, payload);
  });

  it("openDefaultWorkspace invokes the default workspace command without a payload", async () => {
    await expect(openDefaultWorkspace()).resolves.toBe("invoke result");

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("default_workspace");
  });

  it("defaults createFile content to an empty string", async () => {
    await createFile("/notes", "empty.md");

    expect(invoke).toHaveBeenCalledWith("file_create_markdown", {
      rootPath: "/notes",
      path: "empty.md",
      content: "",
    });
  });
});
