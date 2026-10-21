const editTagEvent = "marnote:edit-tag";

export function requestTagEdit(tag: string) {
  window.dispatchEvent(new CustomEvent(editTagEvent, { detail: tag }));
}

export function tagEditEventName() {
  return editTagEvent;
}
