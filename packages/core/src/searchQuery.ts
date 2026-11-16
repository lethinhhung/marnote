export type MatchSource = "Title" | "Folder" | "Tag" | "Content";
export type SearchFilter = { text: string; tag: string; folder: string; type: string };

export function parseSearchQuery(query: string): SearchFilter {
  const filter: SearchFilter = { text: "", tag: "", folder: "", type: "" };
  const words = query.trim().split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.startsWith("#") && word.length > 1) {
      filter.tag = word.slice(1).toLocaleLowerCase();
      continue;
    }
    const match = /^(tag|in|type):(.+)$/i.exec(word);
    if (match) {
      const key = match[1].toLowerCase() === "in" ? "folder" : match[1].toLowerCase();
      filter[key as "tag" | "folder" | "type"] = match[2].replace(/^#/, "").toLocaleLowerCase();
    } else filter.text += `${filter.text ? " " : ""}${word.replace(/^#/, "")}`;
  }
  filter.text = filter.text.toLocaleLowerCase();
  return filter;
}

const hasWords = (value: string, words: string[]) => words.every(word => value.includes(word));
const folderMatches = (path: string, folder: string) => {
  if (!folder) return true;
  const lowerFolder = folder.toLocaleLowerCase();
  return path.toLocaleLowerCase().split("/").some(segment => segment === lowerFolder);
};

export { hasWords, folderMatches };