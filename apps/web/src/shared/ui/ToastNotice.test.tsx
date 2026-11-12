import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastNotice } from "./ToastNotice";

describe("ToastNotice", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows a dismissible alert for a message", () => {
    render(<ToastNotice message="Workspace cleaned" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Workspace cleaned");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("automatically dismisses after five seconds", () => {
    render(<ToastNotice message="Workspace cleaned" />);

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the latest message visible for its full duration", () => {
    const { rerender } = render(<ToastNotice message="First message" />);
    act(() => vi.advanceTimersByTime(4000));
    rerender(<ToastNotice message="Second message" />);

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("alert")).toHaveTextContent("Second message");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("suppresses the same message for ten seconds", () => {
    const { rerender } = render(<ToastNotice message="Workspace cleaned" />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    rerender(<ToastNotice message="" />);
    rerender(<ToastNotice message="Workspace cleaned" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(10000));
    rerender(<ToastNotice message="" />);
    rerender(<ToastNotice message="Workspace cleaned" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Workspace cleaned");
  });
});
