import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import { tagStyle } from "../../shared/ui/tagStyle";

type Props = {
  selectedTags: string[];
  tags: Record<string, string>;
  updateMetadata: (path: string, metadata: { tags: string[] }) => void;
  path: string;
};

export function NoteFooterTags({ selectedTags, tags, updateMetadata, path }: Props) {
  return (
    <span className="note-footer-tag-group">
      <span className="note-footer-tags">
        {selectedTags.map(tag => {
          const color = tags[tag] ?? "#526b58";
          return (
            <span key={tag} className="note-footer-tag-wrap" style={tagStyle(color)}>
              <button type="button" className="note-footer-tag" onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button>
              <button type="button" className="note-footer-tag-remove" aria-label={`Remove ${tag}`} onClick={() => updateMetadata(path, { tags: selectedTags.filter(value => value !== tag) })}>×</button>
            </span>
          );
        })}
      </span>
    </span>
  );
}