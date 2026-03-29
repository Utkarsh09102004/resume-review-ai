import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock next/dynamic to resolve the inner component synchronously
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default?: React.ComponentType } | React.ComponentType>) => {
    // For Promise.resolve-based dynamic, extract the component
    let Comp: React.ComponentType<Record<string, unknown>> | null = null;
    loader().then((mod) => {
      Comp = (typeof mod === "function" ? mod : (mod as { default: React.ComponentType }).default ?? mod) as React.ComponentType<Record<string, unknown>>;
    });
    // Return a wrapper that renders the resolved component
    return function DynamicWrapper(props: Record<string, unknown>) {
      return Comp ? <Comp {...props} /> : null;
    };
  },
}));

// Mock pdfjs-dist to avoid actual PDF rendering
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: vi.fn(() =>
        Promise.resolve({
          getViewport: vi.fn(() => ({ width: 600, height: 800 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      ),
    }),
  })),
}));

import PreviewPanel from "@/components/editor/PreviewPanel";

describe("PreviewPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows placeholder when pdfData is null", () => {
    render(<PreviewPanel pdfData={null} />);
    expect(screen.getByText("PDF Preview")).toBeInTheDocument();
    expect(screen.getByText("Compile your LaTeX to see the output here")).toBeInTheDocument();
  });

  it("renders canvas when pdfData is provided", () => {
    const { container } = render(
      <PreviewPanel pdfData={new Uint8Array([1, 2, 3, 4])} />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });
});
