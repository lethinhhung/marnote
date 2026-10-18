export function isExternalConflict(external: string, saved: string, draft: string): boolean {
  return external !== saved && external !== draft;
}
