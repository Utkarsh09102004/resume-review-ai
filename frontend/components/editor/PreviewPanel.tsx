"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PreviewPanelProps {
  pdfData: Uint8Array | null;
  className?: string;
}

function PreviewPanelInner({ pdfData, className = "" }: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  // Load the PDF document when pdfData changes
  useEffect(() => {
    if (!pdfData) {
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;

    async function loadPdf() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      if (!pdfData) return;
      const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() });
      const pdf = await loadingTask.promise;

      if (cancelled) return;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  // Render the current page whenever the document or page changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || numPages === 0) return;

    let cancelled = false;
    let renderTask: { cancel(): void; promise: Promise<void> } | null = null;

    async function renderPage() {
      if (!pdfDoc) return;

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const containerWidth = containerRef.current?.clientWidth ?? 600;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min((containerWidth - 48) / viewport.width, 2);
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      renderTask = page.render({
        canvas,
        viewport: scaledViewport,
      });
      try {
        await renderTask.promise;
      } catch {
        // Render was cancelled during cleanup — ignore
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, currentPage, numPages]);

  const goToPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPage((p) => Math.min(numPages, p + 1));
  }, [numPages]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col bg-bg-deep ${className}`}
    >
      <div className="flex flex-1 items-start justify-center overflow-auto p-6">
        {pdfData ? (
          <canvas
            ref={canvasRef}
            className="rounded shadow-xl shadow-black/40"
            style={{ backgroundColor: "#f5f5f5" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-16 w-12 rounded border-2 border-dashed border-bg-border" />
              <p className="text-sm text-text-secondary">PDF Preview</p>
              <p className="text-xs text-text-secondary/60">
                Compile your LaTeX to see the output here
              </p>
            </div>
          </div>
        )}
      </div>

      {numPages > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-bg-border bg-bg-elevated px-4 py-2">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentPage <= 1}
            className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30 cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs tabular-nums text-text-secondary">
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            onClick={goToNext}
            disabled={currentPage >= numPages}
            className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30 cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const PreviewPanel = dynamic(() => Promise.resolve(PreviewPanelInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-deep">
      <span className="text-sm text-text-secondary">Loading preview...</span>
    </div>
  ),
});

export default PreviewPanel;
