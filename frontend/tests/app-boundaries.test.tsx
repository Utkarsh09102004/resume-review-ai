import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppError from "@/app/(app)/error";
import AppLoading from "@/app/(app)/loading";
import AppNotFound from "@/app/(app)/not-found";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("authenticated app boundaries", () => {
  it("renders the route-group loading boundary", () => {
    render(<AppLoading />);

    expect(screen.getByText("Loading workspace...")).toBeInTheDocument();
  });

  it("renders the route-group error boundary and retries", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reset = vi.fn();

    render(<AppError error={new Error("boom")} reset={reset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("renders the route-group not-found boundary", () => {
    render(<AppNotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });
});
