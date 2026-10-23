# Editor

## Editing

- Notes open in tabs; closing the active tab saves and selects the most recent remaining tab.
- Edit the title in place; Enter or blur commits. `.md` is shown separately.
- **Markdown** toggles source view; **Copy MD** copies the draft. Saving behavior is defined in [Saving](saving.md).
- External edits show **Load external version** and **Keep mine** options.

## Blocks and links

- Toolbar and `/` menu insert text, headings, lists, tasks, quotes, code, tables, links, and dividers. Slash results support arrow keys, Enter, and Escape.
- Markdown paste is parsed. Blocks can be dragged; code can be copied. Table controls edit rows, columns, headers, and alignment. Wide content can wrap or scroll.
- Links have separate **Web address** and **Workspace item** actions in the toolbar and `/` menu. The web link UI only edits link text and a web address; it focuses link text, Down moves to the address, and Enter saves. The dialog closes when focus leaves it.
- **Link to a note or folder** opens a search-palette overlay. Type to search all notes and folders, use Up/Down to move through results, Enter to create the link, and Escape to close. Show each result's name and path.
- Preserve selected link text when using either action; with no selection, use the URL or workspace item's name as the link text.
- Preserve selected text when adding a link. With no text selected, insert the web address for a web link or the selected item's name for a workspace link. Changing a link's destination keeps its text.
- Normalize bare web domains to HTTPS. Workspace links are portable relative Markdown paths resolved from the current note; moving an item does not rewrite links.
- Workspace links open notes or focus folders in Explorer. If a target no longer exists, identify it as unavailable and allow editing or removing the link without redirecting it.
- Hover or focus a link to show its destination: the address for web links, and the item name and path for workspace links. Offer **Open link**, destination-appropriate copy, **Edit**, and **Remove link** actions.
- Heading and footer expose note metadata; the footer also shows path, save state, and note statistics.

## Gaps

- Slash only inserts editor content.
