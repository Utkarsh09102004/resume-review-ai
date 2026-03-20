"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

interface PreviewPanelProps {
  pdfData: Uint8Array | null;
  className?: string;
}

function PreviewPanelInner({ pdfData, className = "" }: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfData || !canvasRef.current) return;

    let cancelled = false;

    async function renderPdf() {
      const pdfjsLib = await import("pdfjs-dist");

      // Use local worker from public/ (CDN doesn't have v5.x builds)
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      if (!pdfData) return;
      const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() });
      const pdf = await loadingTask.promise;

      if (cancelled) return;

      const page = await pdf.getPage(1);
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const containerWidth = containerRef.current?.clientWidth ?? 600;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min((containerWidth - 48) / viewport.width, 2);
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      await page.render({
        canvas,
        viewport: scaledViewport,
      }).promise;
    }

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full items-start justify-center overflow-auto bg-bg-deep p-6 ${className}`}
    >
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
