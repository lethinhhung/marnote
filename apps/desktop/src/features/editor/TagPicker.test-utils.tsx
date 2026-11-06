import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TagPicker } from "./TagPicker";

export function renderTagPicker(selected: string[] = []) {
  const onChange = vi.fn();
  const onColor = vi.fn();
  const onEdit = vi.fn();
  render(
    <TagPicker
      selected={selected}
      tags={{ work: "#123456", urgent: "#abcdef" }}
      usageCounts={{ work: 3, urgent: 1 }}
      onChange={onChange}
      onColor={onColor}
      onEdit={onEdit}
    />,
  );
  return { onChange, onColor, onEdit };
}

export function openPicker() {
  const trigger = screen.getByRole("button", { name: /add tag|edit tags/i });
  fireEvent.click(trigger);
  return trigger;
}
