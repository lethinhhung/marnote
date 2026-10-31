export type MatchSource = "Title" | "Path" | "Tag" | "Content";

export interface SearchMatch {
  path: string;
  name: string;
  excerpt: string;
  score: number;
  source: MatchSource;
}

export interface SearchOptions {
  tags?: Map<string, string[]>;
  contents?: Map<string, string>;
  limit?: number;
}