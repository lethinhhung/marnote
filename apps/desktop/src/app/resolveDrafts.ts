import { persistTabs } from "./noteTabStorage";
type DraftActions = Record<string, "save" | "discard">;

type Args = { paths: string[]; actions: DraftActions | null; treePath?: string; tabs: string[]; active: string; drafts: Record<string, string>; originals: Record<string, string>; dirty: Set<string>; recent: string[]; save: (path: string, draft: string, original: string) => Promise<boolean>; setDraft: (value: string) => void };

export async function resolveDrafts(args: Args): Promise<boolean> {
  if (!args.actions) return false;
  for (const path of args.paths) {
    if (args.actions[path] === "save") {
      const content = args.drafts[path];
      const original = args.originals[path];
      if (content === undefined || original === undefined || !await args.save(path, content, original)) {
        if (args.treePath) persistTabs(args.treePath, args.tabs, args.active, args.drafts, args.originals, args.dirty, args.recent);
        return false;
      }
      args.originals[path] = content;
      args.dirty.delete(path);
    } else {
      if (args.originals[path] !== undefined) args.drafts[path] = args.originals[path];
      args.dirty.delete(path);
      if (path === args.active && args.originals[path] !== undefined) args.setDraft(args.originals[path]);
    }
  }
  if (args.treePath) persistTabs(args.treePath, args.tabs, args.active, args.drafts, args.originals, args.dirty, args.recent);
  return true;
}
