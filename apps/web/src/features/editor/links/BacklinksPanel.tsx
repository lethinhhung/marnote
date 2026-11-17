import { useEffect, useMemo, useRef, useState } from "react";
import { extractNoteLinks } from "@marnote/core";
import type { Entry } from "../../../shared/domain/workspace";
import { flattenEntries } from "../../../shared/domain/workspace";
import { readFile } from "../../../platform/workspace";

type Backlink = { path: string; name: string };

export function BacklinksPanel({ rootPath, path, entries, onOpen }: {
  rootPath: string; path: string; entries: Entry[]; onOpen: (path: string) => void;
}) {
  const [links, setLinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoaded = useRef(false);
  const sources = useMemo(() => flattenEntries(entries).filter(entry => entry.kind === "file" && entry.path.toLowerCase().endsWith(".md") && entry.path !== path), [entries, path]);
  const sourceKey = sources.map(entry => `${entry.path}:${entry.modifiedMs ?? 0}`).join("\u0000");
  const currentSources = useRef(sources);
  currentSources.current = sources;

  useEffect(() => {
    let active = true;
    if (!hasLoaded.current) setLoading(true);
    void Promise.all(currentSources.current.map(async entry => {
      try {
        const { content } = await readFile(rootPath, entry.path);
        return extractNoteLinks(content, entry.path).includes(path) ? { path: entry.path, name: entry.name.replace(/\.md$/i, "") } : null;
      } catch { return null; }
    })).then(results => {
      if (active) {
        setLinks(results.filter((item): item is Backlink => item !== null));
        hasLoaded.current = true;
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [rootPath, path, sourceKey]);

  return <section className="backlinks-panel" aria-labelledby="backlinks-title">
    <h2 id="backlinks-title">Linked mentions</h2>
    {loading ? <p role="status">Finding linked notes…</p> : links.length ? <ul>{links.map(link =>
      <li key={link.path}><button type="button" onClick={() => onOpen(link.path)}>{link.name}</button><span>{link.path}</span></li>
    )}</ul> : <p>No notes link here yet.</p>}
  </section>;
}
