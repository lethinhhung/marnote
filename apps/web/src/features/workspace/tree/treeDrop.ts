import { parentPath } from "../state/workspacePaths";

export function dropDestination(source: string, targetPath: string, kind?: string) {
  if (!targetPath || targetPath === source) return null;
  const folder = kind === "directory" ? targetPath : kind === "file" ? parentPath(targetPath) : targetPath;
  if (folder === source || folder.startsWith(`${source}/`)) return null;
  const name = source.split("/").pop() || "";
  const destination = [folder, name].filter(Boolean).join("/");
  return destination && destination !== source ? destination : null;
}