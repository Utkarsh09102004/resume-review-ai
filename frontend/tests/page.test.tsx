import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the ResumeForge heading", () => {
    render(<Home />);
    expect(screen.getByText("ResumeForge")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Home />);
    expect(screen.getByText("AI-powered LaTeX resume editor")).toBeInTheDocument();
  });
});
