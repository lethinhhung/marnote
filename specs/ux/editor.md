# Editor

## Editing

- Notes open in tabs; closing the active tab saves and selects the most recent remaining tab.
- Edit the title in place; Enter or blur commits. `.md` is shown separately.
- **Markdown** toggles source view; **Copy MD** copies the draft. Saving behavior is defined in [Saving](saving.md).
- External edits show **Load external version** and **Keep mine** options.

## Blocks and links

- Toolbar and `/` menu insert text, headings, lists, tasks, quotes, code, tables, links, and dividers. Slash results support arrow keys, Enter, and Escape.
- Markdown paste is parsed. Blocks can be dragged; code can be copied. Table controls edit rows, columns, headers, and alignment. Wide content can wrap or scroll.
- Create web links with **Add web address link** in the toolbar or **Link** in the `/` menu. The dialog edits link text and a web address: it focuses the text field, ↓ moves to the address field, and Enter saves. Cancel or Escape closes the dialog and returns focus to the editor; moving focus outside also dismisses it.
- Create workspace links with **Link to a note or folder** in the toolbar or `/` menu. This opens a search-palette overlay showing note and folder names and paths; type to filter, use Up/Down to navigate, Enter to create the link, and Escape to close.
- Preserve selected text when adding either link type. With no selection, use the web address or workspace item's name as link text.
- Normalize bare web domains to HTTPS. Workspace links are portable relative Markdown paths resolved from the current note; moving an item does not rewrite links.
- Workspace links open notes or focus folders in Explorer. If a target no longer exists, identify it as unavailable and allow editing or removing the link without redirecting it.
- Hover or focus a link to show its destination: the address for web links, and the item name and path for workspace links. Offer **Open link**, destination-appropriate copy, **Edit**, and **Remove link** actions.
- Heading and footer expose note metadata; the footer also shows path, save state, and note statistics.

## Gaps

- Slash only inserts editor content.
