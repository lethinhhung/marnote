import { useEffect, useState } from "react";
import { extractNoteLinks } from "@marnote/core";
import type { Entry } from "../../../shared/domain/workspace";
import { flattenEntries } from "../../../shared/domain/workspace";
import { readFile } from "../../../platform/workspace";

type Backlink = { path: string; name: string };

export function BacklinksPanel({ rootPath, path, entries, currentContent, onOpen }: {
  rootPath: string; path: string; entries: Entry[]; currentContent: string; onOpen: (path: string) => void;
}) {
  const [links, setLinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const sources = flattenEntries(entries).filter(entry => entry.kind === "file" && entry.path.toLowerCase().endsWith(".md") && entry.path !== path);
    setLoading(true);
    void Promise.all(sources.map(async entry => {
      try {
        const { content } = await readFile(rootPath, entry.path);
        return extractNoteLinks(content, entry.path).includes(path) ? { path: entry.path, name: entry.name.replace(/\.md$/i, "") } : null;
      } catch { return null; }
    })).then(results => {
      if (active) setLinks(results.filter((item): item is Backlink => item !== null));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [rootPath, path, entries, currentContent]);

  return <section className="backlinks-panel" aria-labelledby="backlinks-title">
    <h2 id="backlinks-title">Linked mentions</h2>
    {loading ? <p role="status">Finding linked notes…</p> : links.length ? <ul>{links.map(link =>
      <li key={link.path}><button type="button" onClick={() => onOpen(link.path)}>{link.name}</button><span>{link.path}</span></li>
    )}</ul> : <p>No notes link here yet.</p>}
  </section>;
}
