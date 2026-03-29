import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";

const { loadPdfJsMock } = vi.hoisted(() => ({
  loadPdfJsMock: vi.fn(),
}));

const mockLoadingTasks: Array<{
  destroy: ReturnType<typeof vi.fn>;
  promise: Promise<{
    destroy: ReturnType<typeof vi.fn>;
    getPage: ReturnType<typeof vi.fn>;
    numPages: number;
  }>;
}> = [];
const mockPdfDocs: Array<{
  destroy: ReturnType<typeof vi.fn>;
  getPage: ReturnType<typeof vi.fn>;
  numPages: number;
}> = [];
const getDocumentMock = vi.fn(() => {
  const pdfDoc = {
    destroy: vi.fn(),
    getPage: vi.fn(() =>
      Promise.resolve({
        getViewport: vi.fn(() => ({ width: 600, height: 800 })),
        render: vi.fn(() => ({
          cancel: vi.fn(),
          promise: Promise.resolve(),
        })),
      }),
    ),
    numPages: 2,
  };
  const loadingTask = {
    destroy: vi.fn(),
    promise: Promise.resolve(pdfDoc),
  };

  mockPdfDocs.push(pdfDoc);
  mockLoadingTasks.push(loadingTask);

  return loadingTask;
});
const pdfJsModule = {
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: getDocumentMock,
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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

vi.mock("@/lib/pdfjs", () => ({
  loadPdfJs: loadPdfJsMock,
}));

import PreviewPanel from "@/components/editor/PreviewPanel";

describe("PreviewPanel", () => {
  beforeEach(() => {
    getDocumentMock.mockClear();
    loadPdfJsMock.mockReset();
    loadPdfJsMock.mockResolvedValue(pdfJsModule);
    mockLoadingTasks.length = 0;
    mockPdfDocs.length = 0;
  });

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

  it("destroys the previous loading task and document when replacing the PDF", async () => {
    const { rerender } = render(<PreviewPanel pdfData={new Uint8Array([1, 2, 3])} />);

    await waitFor(() => {
      expect(mockLoadingTasks).toHaveLength(1);
      expect(mockPdfDocs).toHaveLength(1);
    });

    rerender(<PreviewPanel pdfData={new Uint8Array([4, 5, 6])} />);

    await waitFor(() => {
      expect(mockLoadingTasks[0]?.destroy).toHaveBeenCalledTimes(1);
      expect(mockPdfDocs[0]?.destroy).toHaveBeenCalledTimes(1);
      expect(mockLoadingTasks).toHaveLength(2);
      expect(mockPdfDocs).toHaveLength(2);
    });
  });

  it("destroys the active loading task and document on unmount", async () => {
    const { unmount } = render(<PreviewPanel pdfData={new Uint8Array([7, 8, 9])} />);

    await waitFor(() => {
      expect(mockLoadingTasks).toHaveLength(1);
      expect(mockPdfDocs).toHaveLength(1);
    });

    unmount();

    await waitFor(() => {
      expect(mockLoadingTasks[0]?.destroy).toHaveBeenCalledTimes(1);
      expect(mockPdfDocs[0]?.destroy).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores stale async imports so the latest preview stays active", async () => {
    const firstImport = createDeferred<typeof pdfJsModule>();
    const secondImport = createDeferred<typeof pdfJsModule>();
    loadPdfJsMock
      .mockImplementationOnce(() => firstImport.promise)
      .mockImplementationOnce(() => secondImport.promise);

    const { rerender } = render(<PreviewPanel pdfData={new Uint8Array([1, 2, 3])} />);

    rerender(<PreviewPanel pdfData={new Uint8Array([4, 5, 6])} />);

    await act(async () => {
      secondImport.resolve(pdfJsModule);
      await secondImport.promise;
    });

    await waitFor(() => {
      expect(getDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockLoadingTasks).toHaveLength(1);
      expect(mockPdfDocs).toHaveLength(1);
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    await act(async () => {
      firstImport.resolve(pdfJsModule);
      await firstImport.promise;
    });

    await waitFor(() => {
      expect(getDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockLoadingTasks).toHaveLength(1);
      expect(mockPdfDocs).toHaveLength(1);
      expect(mockLoadingTasks[0]?.destroy).not.toHaveBeenCalled();
      expect(mockPdfDocs[0]?.destroy).not.toHaveBeenCalled();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });
  });

  it("does not create a loading task after unmount if the import resolves late", async () => {
    const pendingImport = createDeferred<typeof pdfJsModule>();
    loadPdfJsMock.mockImplementationOnce(() => pendingImport.promise);

    const { unmount } = render(<PreviewPanel pdfData={new Uint8Array([7, 8, 9])} />);

    unmount();

    await act(async () => {
      pendingImport.resolve(pdfJsModule);
      await pendingImport.promise;
    });

    await waitFor(() => {
      expect(getDocumentMock).not.toHaveBeenCalled();
      expect(mockLoadingTasks).toHaveLength(0);
      expect(mockPdfDocs).toHaveLength(0);
    });
  });
});
