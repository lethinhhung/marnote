import { Extension } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";

function containsMarkdown(text: string) {
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```)/m.test(text)
    || /\|.+\|\s*\n\s*\|?(?:\s*:?-{3,}:?\s*\|)+/m.test(text);
}

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      props: {
        handlePaste: (_view, event) => {
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (!containsMarkdown(text)) return false;
          event.preventDefault();
          editor.commands.insertContent(text, { contentType: "markdown" });
          return true;
        },
      },
    })];
  },
});
