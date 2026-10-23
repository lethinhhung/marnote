# Editor

## Editing

- Notes open in tabs; closing the active tab saves and selects the most recent remaining tab.
- Edit the title in place; Enter or blur commits. `.md` is shown separately.
- **Markdown** toggles source view; **Copy MD** copies the draft. Saving behavior is defined in [Saving](saving.md).
- External edits show **Load external version** and **Keep mine** options.

## Blocks and links

- Toolbar and `/` menu insert text, headings, lists, tasks, quotes, code, tables, links, and dividers. Slash results support arrow keys, Enter, and Escape.
- Markdown paste is parsed. Blocks can be dragged; code can be copied. Table controls edit rows, columns, headers, and alignment. Wide content can wrap or scroll.
- Add or edit links through the toolbar or `/` using one shared flow with two destinations: **Web address** and **Workspace item**. The workspace picker searches/selects notes and folders; show each item's name and path.
- Preserve selected text when adding a link. With no text selected, insert the web address for a web link or the selected item's name for a workspace link. Changing a link's destination keeps its text.
- Normalize bare web domains to HTTPS. Workspace links are portable relative Markdown paths resolved from the current note; moving an item does not rewrite links.
- Workspace links open notes or focus folders in Explorer. If a target no longer exists, identify it as unavailable and allow editing or removing the link without redirecting it.
- Hover or focus a link to show its destination: the address for web links, and the item name and path for workspace links. Offer **Open link**, destination-appropriate copy, **Edit**, and **Remove link** actions.
- Heading and footer expose note metadata; the footer also shows path, save state, and note statistics.

## Gaps

- Slash only inserts editor content.
